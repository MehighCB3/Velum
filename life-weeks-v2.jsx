import React, { useState } from 'react';

export default function LifeWeeks() {
  const [expandedYear, setExpandedYear] = useState(null);
  const [zoomLevel, setZoomLevel] = useState('macro'); // macro, micro
  
  const age = 32;
  const lifeExpectancy = 85;
  const currentWeekOfYear = 5;
  const weeksLived = age * 52 + currentWeekOfYear;
  const totalWeeks = lifeExpectancy * 52;
  const weeksRemaining = totalWeeks - weeksLived;

  const phases = [
    { name: 'Childhood', start: 0, end: 5, color: '#fbbf24' },
    { name: 'School', start: 6, end: 17, color: '#f97316' },
    { name: 'University', start: 18, end: 22, color: '#ef4444' },
    { name: 'Early Career', start: 23, end: 35, color: '#8b5cf6' },
    { name: 'Growth', start: 36, end: 50, color: '#3b82f6' },
    { name: 'Prime', start: 51, end: 65, color: '#06b6d4' },
    { name: 'Freedom', start: 66, end: 85, color: '#10b981' },
  ];

  const getPhase = (year) => phases.find(p => year >= p.start && year <= p.end);

  const handleYearClick = (year) => {
    if (expandedYear === year) {
      setExpandedYear(null);
    } else {
      setExpandedYear(year);
    }
  };

  // Macro: clean horizontal bars
  const renderMacroView = () => {
    return (
      <div className="space-y-px">
        {Array.from({ length: lifeExpectancy + 1 }, (_, year) => {
          const isLived = year < age;
          const isCurrent = year === age;
          const phase = getPhase(year);
          const progress = isCurrent ? (currentWeekOfYear / 52) * 100 : isLived ? 100 : 0;
          const isExpanded = expandedYear === year;
          
          return (
            <div key={year}>
              <div 
                className="flex items-center gap-1.5 group cursor-pointer"
                onClick={() => handleYearClick(year)}
              >
                <span className="text-[8px] text-gray-500 w-4 text-right font-mono leading-none">
                  {year % 5 === 0 ? year : ''}
                </span>
                <div className={`flex-1 bg-gray-800 rounded-sm overflow-hidden relative transition-all ${isExpanded ? 'h-3' : 'h-2'} ${isExpanded ? 'ring-1 ring-white/20' : ''}`}>
                  <div 
                    className="h-full rounded-sm"
                    style={{ 
                      width: `${progress}%`,
                      backgroundColor: phase?.color || '#374151',
                      opacity: isLived ? 0.6 : 1,
                    }}
                  />
                  {isCurrent && (
                    <div 
                      className="absolute top-0 h-full w-0.5 bg-white"
                      style={{ left: `${progress}%` }}
                    />
                  )}
                </div>
                <span className="text-[8px] text-gray-500 w-4 font-mono leading-none opacity-0 group-hover:opacity-100 transition-opacity">
                  {year}
                </span>
              </div>

              {/* Expanded week view */}
              {isExpanded && (
                <div className="ml-6 mr-4 my-1.5 p-2 bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] text-gray-400">
                      Year {year} · {phase?.name}
                    </span>
                    <span className="text-[9px] text-gray-500">
                      {isCurrent ? `Week ${currentWeekOfYear}/52` : isLived ? '52/52' : '0/52'}
                    </span>
                  </div>
                  <div className="grid grid-cols-26 gap-px">
                    {Array.from({ length: 52 }, (_, w) => {
                      const weekNum = w + 1;
                      const isWeekLived = isLived || (isCurrent && weekNum <= currentWeekOfYear);
                      const isCurrentWeek = isCurrent && weekNum === currentWeekOfYear;
                      
                      return (
                        <div 
                          key={w}
                          className="aspect-square rounded-sm"
                          style={{
                            backgroundColor: isCurrentWeek ? '#ffffff' : 
                              isWeekLived ? phase?.color : '#1f2937',
                            opacity: isWeekLived && !isCurrentWeek ? 0.5 : 1,
                          }}
                          title={`Week ${weekNum}`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Micro: all weeks visible as dots, grouped by decade
  const renderMicroView = () => {
    return (
      <div className="space-y-4">
        {phases.map((phase) => (
          <div key={phase.name}>
            <div className="flex items-center gap-2 mb-1.5">
              <span 
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: phase.color }}
              />
              <span className="text-[9px] text-gray-400">{phase.name}</span>
              <span className="text-[8px] text-gray-600">{phase.start}–{phase.end}</span>
            </div>
            <div className="grid gap-px" style={{ gridTemplateColumns: 'repeat(52, 1fr)' }}>
              {Array.from({ length: (phase.end - phase.start + 1) * 52 }, (_, i) => {
                const yearOffset = Math.floor(i / 52);
                const year = phase.start + yearOffset;
                const week = (i % 52) + 1;
                const globalWeek = year * 52 + week;
                const isLived = globalWeek <= weeksLived;
                const isCurrent = year === age && week === currentWeekOfYear;
                
                return (
                  <div 
                    key={i}
                    className="aspect-square rounded-sm"
                    style={{
                      backgroundColor: isCurrent ? '#ffffff' : 
                        isLived ? phase.color : '#1f2937',
                      opacity: isLived && !isCurrent ? 0.45 : 1,
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-base font-semibold text-gray-800">Life</h1>
            <p className="text-[10px] text-gray-400">Your time, visualized</p>
          </div>
          <span className="text-[10px] text-gray-400 hover:text-gray-600 cursor-pointer">Age: {age} ✎</span>
        </div>

        {/* Toggle */}
        <div className="flex bg-white rounded-lg p-0.5 mb-3 text-[10px]">
          <button 
            onClick={() => { setZoomLevel('macro'); setExpandedYear(null); }}
            className={`flex-1 py-1 rounded ${zoomLevel === 'macro' ? 'bg-gray-100 text-gray-800 font-medium' : 'text-gray-400'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setZoomLevel('micro')}
            className={`flex-1 py-1 rounded ${zoomLevel === 'micro' ? 'bg-gray-100 text-gray-800 font-medium' : 'text-gray-400'}`}
          >
            All weeks
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-gray-900 rounded-xl p-4">
          
          {/* Hero */}
          <div className="text-center pt-2 pb-4">
            <div className="text-5xl font-bold text-white">{weeksRemaining.toLocaleString()}</div>
            <div className="text-sm text-gray-400 mt-1">Weeks remaining</div>
          </div>

          {/* Phase Legend */}
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mb-4">
            {phases.map((phase) => (
              <div key={phase.name} className="flex items-center gap-1">
                <span 
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: phase.color }}
                />
                <span className="text-[8px] text-gray-500">{phase.name}</span>
              </div>
            ))}
          </div>

          {/* Hint */}
          {zoomLevel === 'macro' && (
            <div className="text-[9px] text-gray-600 text-center mb-2">
              Click any year to see its weeks
            </div>
          )}

          {/* Visualization */}
          <div className="max-h-96 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 transparent' }}>
            {zoomLevel === 'macro' ? renderMacroView() : renderMicroView()}
          </div>
        </div>

        {/* AI Agent */}
        <div className="bg-white rounded-xl p-3 mt-3 flex gap-2.5">
          <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs">⏳</span>
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed">
            You're in your Early Career phase — statistically the highest-leverage decade for compounding skills and relationships. Make it count.
          </p>
        </div>
      </div>
    </div>
  );
}
