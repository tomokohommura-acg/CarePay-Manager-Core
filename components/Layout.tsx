
import React, { useMemo, useState } from 'react';
// Changed PeriodConfig to EvaluationPeriodMaster to fix the import error.
import { BusinessType, Office, EvaluationPeriodMaster } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'staff' | 'staff_list' | 'master' | 'history' | 'export' | 'smarthr_settings';
  setActiveTab: (tab: 'staff' | 'staff_list' | 'master' | 'history' | 'export' | 'smarthr_settings') => void;
  offices: Office[];
  selectedOfficeId: string;
  setSelectedOfficeId: (id: string) => void;
  // Updated periodConfig type to use EvaluationPeriodMaster
  periodConfig: {
    evaluationStart: string;
    evaluationEnd: string;
    paymentStart: string;
    paymentEnd: string;
  };
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  setActiveTab, 
  offices, 
  selectedOfficeId, 
  setSelectedOfficeId,
  periodConfig
}) => {
  const selectedOffice = offices.find(o => o.id === selectedOfficeId);
  const [filterType, setFilterType] = useState<BusinessType>(selectedOffice?.type || BusinessType.HOME_CARE);

  const filteredOffices = useMemo(() => {
    return offices.filter(o => o.type === filterType);
  }, [offices, filterType]);

  const handleTypeChange = (type: BusinessType) => {
    setFilterType(type);
    const firstOfNewType = offices.find(o => o.type === type);
    if (firstOfNewType) {
      setSelectedOfficeId(firstOfNewType.id);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <aside className="w-72 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-tight">CarePay Manager</h1>
          <p className="text-xs text-slate-400 mt-1">事業所別・給与加算減算</p>
        </div>

        <div className="p-4 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
              業態カテゴリ
            </label>
            <select 
              value={filterType}
              onChange={(e) => handleTypeChange(e.target.value as BusinessType)}
              className="w-full bg-slate-800 border-slate-700 rounded-lg p-2.5 text-sm outline-none text-slate-200"
            >
              <option value={BusinessType.HOME_CARE}>🏠 訪問介護</option>
              <option value={BusinessType.HOME_NURSING}>🏥 訪問看護</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
              事業所切り替え
            </label>
            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {filteredOffices.map(office => (
                <button
                  key={office.id}
                  onClick={() => setSelectedOfficeId(office.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between ${
                    selectedOfficeId === office.id 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span className="truncate font-medium">{office.name}</span>
                </button>
              ))}
            </div>
          </div>

          <nav className="space-y-1 border-t border-slate-800 pt-6">
            <button onClick={() => setActiveTab('staff')} className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'staff' ? 'bg-slate-800 text-indigo-400 ring-1 ring-slate-700' : 'text-slate-300 hover:bg-slate-800'}`}>
              📊 評価データ入力
            </button>
            <button onClick={() => setActiveTab('staff_list')} className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'staff_list' ? 'bg-slate-800 text-indigo-400 ring-1 ring-slate-700' : 'text-slate-300 hover:bg-slate-800'}`}>
              👥 職員名簿
            </button>
            <button onClick={() => setActiveTab('history')} className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-slate-800 text-indigo-400 ring-1 ring-slate-700' : 'text-slate-300 hover:bg-slate-800'}`}>
              📋 評価履歴
            </button>
            <button onClick={() => setActiveTab('master')} className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'master' ? 'bg-slate-800 text-indigo-400 ring-1 ring-slate-700' : 'text-slate-300 hover:bg-slate-800'}`}>
              ⚙️ マスタ管理
            </button>
            <button onClick={() => setActiveTab('export')} className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'export' ? 'bg-slate-800 text-indigo-400 ring-1 ring-slate-700' : 'text-slate-300 hover:bg-slate-800'}`}>
              📥 CSV出力
            </button>
            <div className="border-t border-slate-800 my-4"></div>
            <button onClick={() => setActiveTab('smarthr_settings')} className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'smarthr_settings' ? 'bg-slate-800 text-emerald-400 ring-1 ring-slate-700' : 'text-slate-300 hover:bg-slate-800'}`}>
              🔗 SmartHR連携
            </button>
          </nav>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 sticky top-0 z-10 shadow-sm flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedOffice?.type === BusinessType.HOME_CARE ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                {selectedOffice?.type === BusinessType.HOME_CARE ? '訪問介護' : '訪問看護'}
              </span>
              <h2 className="text-xl font-bold text-slate-800">{selectedOffice?.name}</h2>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">給与反映期間</span>
              <span className="text-sm font-bold text-indigo-600">{periodConfig.paymentStart} 〜 {periodConfig.paymentEnd}</span>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200">🏢</div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
