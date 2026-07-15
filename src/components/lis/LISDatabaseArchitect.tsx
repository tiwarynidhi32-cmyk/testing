import { useState } from 'react';
import { 
  Database, 
  Copy, 
  Check, 
  Server, 
  Table as TableIcon,
  Search,
  CheckCircle2,
  FileCode,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function LISDatabaseArchitect() {
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [activeSchemaTab, setActiveSchemaTab] = useState<'mysql' | 'supabase'>('supabase');

  const MYSQL_DDL_SCHEMA = `-- =========================================================================
-- PATHOLOGY LABORATORY LIS/LIMS SYSTEM - DATABASE ARCHITECTURE LAYOUT
-- Target DBMS: MySQL 8.0+
-- Mapped relational tables with primary keys, foreign constraints, and indexing.
-- =========================================================================

CREATE DATABASE IF NOT EXISTS pathology_lims;
USE pathology_lims;

-- 1. Patient Table (Clinical Demographics)
CREATE TABLE IF NOT EXISTS patients (
    pat_id VARCHAR(36) PRIMARY KEY,
    mrn VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    dob DATE NOT NULL,
    gender ENUM('Male', 'Female', 'Other') NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    address TEXT,
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_mrn (mrn),
    INDEX idx_phone (phone_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Category Master Table
CREATE TABLE IF NOT EXISTS test_categories (
    cat_id VARCHAR(36) PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Sub-Category Master Table
CREATE TABLE IF NOT EXISTS test_subcategories (
    subcat_id VARCHAR(36) PRIMARY KEY,
    category_id VARCHAR(36) NOT NULL,
    subcategory_name VARCHAR(120) NOT NULL,
    description TEXT,
    FOREIGN KEY (category_id) REFERENCES test_categories(cat_id) ON DELETE CASCADE,
    UNIQUE KEY uq_cat_sub (category_id, subcategory_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Unit Master Table
CREATE TABLE IF NOT EXISTS test_units (
    unit_id VARCHAR(36) PRIMARY KEY,
    unit_name VARCHAR(50) NOT NULL,
    unit_symbol VARCHAR(15) UNIQUE NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Investigation/Test Master Table (Tests like CBC, LFT, Lipid)
CREATE TABLE IF NOT EXISTS investigation_tests (
    test_code VARCHAR(30) PRIMARY KEY,
    test_name VARCHAR(150) NOT NULL,
    short_name VARCHAR(30) NOT NULL,
    department VARCHAR(80) NOT NULL,
    category_id VARCHAR(36) NOT NULL,
    subcategory_id VARCHAR(36) NOT NULL,
    sample_type VARCHAR(60) NOT NULL,
    processing_method VARCHAR(100) DEFAULT 'Automated',
    machine_name VARCHAR(120),
    report_type ENUM('Quantitative', 'Qualitative', 'Narrative') DEFAULT 'Quantitative',
    tat_hours VARCHAR(20) DEFAULT '6 Hours',
    normal_range_applicable BOOLEAN DEFAULT TRUE,
    critical_value_applicable BOOLEAN DEFAULT TRUE,
    nabl_compliance BOOLEAN DEFAULT TRUE,
    price DECIMAL(10,2) DEFAULT '0.00',
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    FOREIGN KEY (category_id) REFERENCES test_categories(cat_id),
    FOREIGN KEY (subcategory_id) REFERENCES test_subcategories(subcat_id),
    INDEX idx_test_name (test_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Test Parameter Master Table
CREATE TABLE IF NOT EXISTS test_parameters (
    parameter_id VARCHAR(36) PRIMARY KEY,
    test_code VARCHAR(30) NOT NULL,
    parameter_name VARCHAR(120) NOT NULL,
    unit_symbol VARCHAR(15),
    decimal_places TINYINT UNSIGNED DEFAULT 1,
    sequence_no INT DEFAULT 10,
    formula_based BOOLEAN DEFAULT FALSE,
    calculation_formula VARCHAR(255),
    FOREIGN KEY (test_code) REFERENCES investigation_tests(test_code) ON DELETE CASCADE,
    INDEX idx_param_test (test_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Age & Gender Based Reference Range Master Table
CREATE TABLE IF NOT EXISTS parameter_reference_ranges (
    range_id VARCHAR(36) PRIMARY KEY,
    parameter_id VARCHAR(36) NOT NULL,
    gender ENUM('Male', 'Female', 'Other', 'All') DEFAULT 'All',
    age_group ENUM('Newborn', 'Infant', 'Child', 'Adolescent', 'Adult', 'Senior', 'All') DEFAULT 'All',
    low_range_val DECIMAL(12,4) NOT NULL,
    high_range_val DECIMAL(12,4) NOT NULL,
    critical_low_val DECIMAL(12,4),
    critical_high_val DECIMAL(12,4),
    FOREIGN KEY (parameter_id) REFERENCES test_parameters(parameter_id) ON DELETE CASCADE,
    INDEX idx_ref_param (parameter_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Critical Value Calibration Master Table
CREATE TABLE IF NOT EXISTS parameter_critical_ranges (
    config_id VARCHAR(36) PRIMARY KEY,
    parameter_id VARCHAR(36) UNIQUE NOT NULL,
    low_critical_limit DECIMAL(12,4) NOT NULL,
    high_critical_limit DECIMAL(12,4) NOT NULL,
    alert_message VARCHAR(255) NOT NULL,
    FOREIGN KEY (parameter_id) REFERENCES test_parameters(parameter_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Sample Collection & Transit Registry Table
CREATE TABLE IF NOT EXISTS sample_registrations (
    sample_id VARCHAR(36) PRIMARY KEY,
    pat_id VARCHAR(36) NOT NULL,
    collected_by_id VARCHAR(36),
    collection_status ENUM('Pending', 'Collected', 'Received', 'In-Transit', 'Rejected') DEFAULT 'Pending',
    collection_time TIMESTAMP NULL,
    transit_received_time TIMESTAMP NULL,
    rejection_reason_notes VARCHAR(255),
    FOREIGN KEY (pat_id) REFERENCES patients(pat_id) ON DELETE CASCADE,
    INDEX idx_sample_status (collection_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. LIS Results Logging Table
CREATE TABLE IF NOT EXISTS lis_results_releases (
    release_id VARCHAR(36) PRIMARY KEY,
    sample_id VARCHAR(36) NOT NULL,
    test_code VARCHAR(30) NOT NULL,
    pathologist_comments TEXT,
    verified_by_doctor VARCHAR(120),
    released_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delta_check_audit VARCHAR(100),
    FOREIGN KEY (sample_id) REFERENCES sample_registrations(sample_id),
    FOREIGN KEY (test_code) REFERENCES investigation_tests(test_code),
    UNIQUE KEY uq_sample_test (sample_id, test_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Individual Parameters Result Metrics Table
CREATE TABLE IF NOT EXISTS parameter_result_values (
    val_id INT AUTO_INCREMENT PRIMARY KEY,
    release_id VARCHAR(36) NOT NULL,
    parameter_id VARCHAR(36) NOT NULL,
    observed_value VARCHAR(50) NOT NULL,
    observed_status ENUM('Normal', 'Low', 'High', 'Critical') DEFAULT 'Normal',
    FOREIGN KEY (release_id) REFERENCES lis_results_releases(release_id) ON DELETE CASCADE,
    FOREIGN KEY (parameter_id) REFERENCES test_parameters(parameter_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

  const SUPABASE_DDL_SCHEMA = `-- =========================================================================
-- PATHOLOGY LABORATORY LIS/LIMS SYSTEM - DATABASE ARCHITECTURE LAYOUT
-- Target DBMS: PostgreSQL / Supabase
-- Fully optimized for Supabase with Row Level Security (RLS) policies.
-- =========================================================================

-- Note: Patients table is already managed by the core schema (public.patients).
-- We link directly to patient ID via UUID references for consistent data integrity.

-- 1. Category Master Table
CREATE TABLE IF NOT EXISTS public.test_categories (
    cat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name TEXT UNIQUE NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Sub-Category Master Table
CREATE TABLE IF NOT EXISTS public.test_subcategories (
    subcat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES public.test_categories(cat_id) ON DELETE CASCADE,
    subcategory_name TEXT NOT NULL,
    description TEXT,
    CONSTRAINT uq_cat_sub UNIQUE (category_id, subcategory_name)
);

-- 3. Unit Master Table
CREATE TABLE IF NOT EXISTS public.test_units (
    unit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_name TEXT NOT NULL,
    unit_symbol TEXT UNIQUE NOT NULL
);

-- 4. Investigation/Test Master Table (Tests like CBC, LFT, Lipid)
CREATE TABLE IF NOT EXISTS public.investigation_tests (
    test_code VARCHAR(30) PRIMARY KEY,
    test_name TEXT NOT NULL,
    short_name VARCHAR(30) NOT NULL,
    department TEXT NOT NULL,
    category_id UUID REFERENCES public.test_categories(cat_id) ON DELETE SET NULL,
    subcategory_id UUID REFERENCES public.test_subcategories(subcat_id) ON DELETE SET NULL,
    sample_type TEXT NOT NULL,
    processing_method TEXT DEFAULT 'Automated',
    machine_name TEXT,
    report_type TEXT DEFAULT 'Quantitative' CHECK (report_type IN ('Quantitative', 'Qualitative', 'Narrative')),
    tat_hours TEXT DEFAULT '6 Hours',
    normal_range_applicable BOOLEAN DEFAULT TRUE,
    critical_value_applicable BOOLEAN DEFAULT TRUE,
    nabl_compliance BOOLEAN DEFAULT TRUE,
    price DECIMAL(10,2) DEFAULT '0.00'::numeric,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_investigation_tests_name ON public.investigation_tests (test_name);

-- 5. Test Parameter Master Table
CREATE TABLE IF NOT EXISTS public.test_parameters (
    parameter_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_code VARCHAR(30) NOT NULL REFERENCES public.investigation_tests(test_code) ON DELETE CASCADE,
    parameter_name TEXT NOT NULL,
    unit_symbol TEXT,
    decimal_places INT DEFAULT 1,
    sequence_no INT DEFAULT 10,
    formula_based BOOLEAN DEFAULT FALSE,
    calculation_formula TEXT
);

CREATE INDEX IF NOT EXISTS idx_test_parameters_code ON public.test_parameters (test_code);

-- 6. Age & Gender Based Reference Range Master Table
CREATE TABLE IF NOT EXISTS public.parameter_reference_ranges (
    range_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parameter_id UUID NOT NULL REFERENCES public.test_parameters(parameter_id) ON DELETE CASCADE,
    gender TEXT DEFAULT 'All' CHECK (gender IN ('Male', 'Female', 'Other', 'All')),
    age_group TEXT DEFAULT 'All' CHECK (age_group IN ('Newborn', 'Infant', 'Child', 'Adolescent', 'Adult', 'Senior', 'All')),
    low_range_val DECIMAL(12,4) NOT NULL,
    high_range_val DECIMAL(12,4) NOT NULL,
    critical_low_val DECIMAL(12,4),
    critical_high_val DECIMAL(12,4)
);

CREATE INDEX IF NOT EXISTS idx_ref_ranges_parameter ON public.parameter_reference_ranges (parameter_id);

-- 7. Critical Value Calibration Master Table
CREATE TABLE IF NOT EXISTS public.parameter_critical_ranges (
    config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parameter_id UUID UNIQUE NOT NULL REFERENCES public.test_parameters(parameter_id) ON DELETE CASCADE,
    low_critical_limit DECIMAL(12,4) NOT NULL,
    high_critical_limit DECIMAL(12,4) NOT NULL,
    alert_message TEXT NOT NULL
);

-- 8. Sample Collection & Transit Registry Table
CREATE TABLE IF NOT EXISTS public.sample_registrations (
    sample_id VARCHAR(36) PRIMARY KEY,
    pat_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    collected_by_id UUID,
    collection_status TEXT DEFAULT 'Pending' CHECK (collection_status IN ('Pending', 'Collected', 'Received', 'In-Transit', 'Rejected')),
    collection_time TIMESTAMPTZ,
    transit_received_time TIMESTAMPTZ,
    rejection_reason_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_sample_reg_status ON public.sample_registrations (collection_status);

-- 9. LIS Results Logging Table
CREATE TABLE IF NOT EXISTS public.lis_results_releases (
    release_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sample_id VARCHAR(36) NOT NULL REFERENCES public.sample_registrations(sample_id) ON DELETE CASCADE,
    test_code VARCHAR(30) NOT NULL REFERENCES public.investigation_tests(test_code) ON DELETE CASCADE,
    pathologist_comments TEXT,
    verified_by_doctor TEXT,
    released_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    delta_check_audit TEXT,
    CONSTRAINT uq_sample_test UNIQUE (sample_id, test_code)
);

-- 10. Individual Parameters Result Metrics Table
CREATE TABLE IF NOT EXISTS public.parameter_result_values (
    val_id BIGSERIAL PRIMARY KEY,
    release_id UUID NOT NULL REFERENCES public.lis_results_releases(release_id) ON DELETE CASCADE,
    parameter_id UUID NOT NULL REFERENCES public.test_parameters(parameter_id) ON DELETE CASCADE,
    observed_value TEXT NOT NULL,
    observed_status TEXT DEFAULT 'Normal' CHECK (observed_status IN ('Normal', 'Low', 'High', 'Critical'))
);

-- Enable Row Level Security (RLS) on all LIMS tables
ALTER TABLE public.test_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parameter_reference_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parameter_critical_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lis_results_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parameter_result_values ENABLE ROW LEVEL SECURITY;

-- Create Policies for Authenticated & Public access inside Supabase SQL Editor
CREATE POLICY "Allow public read for test_categories" ON public.test_categories FOR SELECT USING (true);
CREATE POLICY "Allow public write for test_categories" ON public.test_categories FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read for test_subcategories" ON public.test_subcategories FOR SELECT USING (true);
CREATE POLICY "Allow public write for test_subcategories" ON public.test_subcategories FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read for test_units" ON public.test_units FOR SELECT USING (true);
CREATE POLICY "Allow public write for test_units" ON public.test_units FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read for investigation_tests" ON public.investigation_tests FOR SELECT USING (true);
CREATE POLICY "Allow public write for investigation_tests" ON public.investigation_tests FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read for test_parameters" ON public.test_parameters FOR SELECT USING (true);
CREATE POLICY "Allow public write for test_parameters" ON public.test_parameters FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read for parameter_reference_ranges" ON public.parameter_reference_ranges FOR SELECT USING (true);
CREATE POLICY "Allow public write for parameter_reference_ranges" ON public.parameter_reference_ranges FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read for parameter_critical_ranges" ON public.parameter_critical_ranges FOR SELECT USING (true);
CREATE POLICY "Allow public write for parameter_critical_ranges" ON public.parameter_critical_ranges FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read for sample_registrations" ON public.sample_registrations FOR SELECT USING (true);
CREATE POLICY "Allow public write for sample_registrations" ON public.sample_registrations FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read for lis_results_releases" ON public.lis_results_releases FOR SELECT USING (true);
CREATE POLICY "Allow public write for lis_results_releases" ON public.lis_results_releases FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read for parameter_result_values" ON public.parameter_result_values FOR SELECT USING (true);
CREATE POLICY "Allow public write for parameter_result_values" ON public.parameter_result_values FOR ALL USING (true) WITH CHECK (true);
`;

  const handleCopySQL = () => {
    const currentScript = activeSchemaTab === 'supabase' ? SUPABASE_DDL_SCHEMA : MYSQL_DDL_SCHEMA;
    navigator.clipboard.writeText(currentScript);
    setCopiedScript(activeSchemaTab === 'supabase' ? 'SUPABASE' : 'MYSQL');
    toast.success(`${activeSchemaTab === 'supabase' ? 'Supabase PostgreSQL' : 'MySQL'} schema DDL copied to clipboard!`);
    setTimeout(() => setCopiedScript(null), 3000);
  };


  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER CARD */}
      <div className="border border-slate-200/60 bg-indigo-50/15 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-600" />
            LIMS Database Architecture
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Relational tables blueprint optimized for low-latency diagnostic queries, multi-parameter sheets, and delta histories tracking in Supabase or MySQL.
          </p>
        </div>
        <Button 
          className="bg-indigo-650 hover:bg-indigo-750 text-white font-bold text-xs h-9 gap-1.5 rounded-lg shrink-0 shadow-sm shadow-indigo-100"
          onClick={handleCopySQL}
        >
          {copiedScript ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          Copy {activeSchemaTab === 'supabase' ? 'Supabase DDL' : 'MySQL DDL'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* RELATIONAL MAPPED COLUMNS GUIDE AND MAPS */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-50">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-600" /> Relational Catalog Map
              </CardTitle>
              <CardDescription className="text-xs">Physical linkage maps supporting clinical cascades and indexing algorithms.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs font-semibold">
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5">
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 font-mono text-[9px]">1-to-Many</Badge>
                  <p className="text-slate-800 font-bold">Category ➔ Subcategories ➔ Tests</p>
                  <p className="font-normal text-slate-500 leading-relaxed text-[11px]">
                    Tests like complete blood count map under Hematology. Ensures administrative separation and routing.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5">
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 font-mono text-[9px]">Composite Key</Badge>
                  <p className="text-slate-800 font-bold">Test Master ➔ Parameter Master</p>
                  <p className="font-normal text-slate-500 leading-relaxed text-[11px]">
                    Parameters like TLC and Platelet Count are constituents of CBC. Decimals and sequences are defined individually.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5">
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 font-mono text-[9px]">Cascades</Badge>
                  <p className="text-slate-800 font-bold">Parameters ➔ Reference Ranges & Criticals</p>
                  <p className="font-normal text-slate-500 leading-relaxed text-[11px]">
                    Maintains age, gender, and critical boundaries mapped with cascaded deletions during updates.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CODE RENDER PANEL WITH TABS */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
            <Button
              variant={activeSchemaTab === 'supabase' ? 'secondary' : 'ghost'}
              size="xs"
              onClick={() => setActiveSchemaTab('supabase')}
              className={`text-xs font-bold leading-none h-8 px-3 rounded-lg ${activeSchemaTab === 'supabase' ? 'bg-white text-indigo-950 shadow-sm' : 'text-slate-600'}`}
            >
              Supabase / PostgreSQL
            </Button>
            <Button
              variant={activeSchemaTab === 'mysql' ? 'secondary' : 'ghost'}
              size="xs"
              onClick={() => setActiveSchemaTab('mysql')}
              className={`text-xs font-bold leading-none h-8 px-3 rounded-lg ${activeSchemaTab === 'mysql' ? 'bg-white text-indigo-950 shadow-sm' : 'text-slate-600'}`}
            >
              MySQL Ready Schema
            </Button>
          </div>

          <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50 pt-4 pb-3 flex flex-row items-center justify-between border-b border-slate-200">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-indigo-600" /> {activeSchemaTab === 'supabase' ? 'Supabase PostgreSQL Schema' : 'MySQL Ready Schema'}
              </CardTitle>
              <Badge className="bg-indigo-100 text-indigo-800 font-black text-[9px] border-none">
                {activeSchemaTab === 'supabase' ? 'PostgreSQL Dialect' : 'ANSI SQL Mapped'}
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <pre className="p-4 bg-slate-950 text-slate-300 font-mono text-[10px] overflow-auto max-h-[500px] leading-relaxed custom-scrollbar selection:bg-slate-800">
                {activeSchemaTab === 'supabase' ? SUPABASE_DDL_SCHEMA : MYSQL_DDL_SCHEMA}
              </pre>
            </CardContent>
          </Card>
        </div>

      </div>

    </div>
  );
}
