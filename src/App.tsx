import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar as CalendarIcon, 
  Users, 
  ClipboardList, 
  Send, 
  RefreshCw, 
  AlertCircle, 
  User, 
  BarChart3,
  Search,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  LayoutGrid,
  List,
  Trash2,
  Filter,
  FileText,
  Lightbulb,
  X,
  ChevronDown
} from "lucide-react";

// Types
interface Assignment {
  title: string;
  description: string;
  importance: 'High' | 'Medium' | 'Low';
  suggestedReporter: string;
  category: string;
  date: string; // YYYY-MM-DD
}

type ReporterStatus = 'Available' | 'Busy' | 'On Leave';

const GEN_MODEL = "gemini-3-flash-preview";

const NEWSROOMS = [
  // Trinidad & Tobago
  { 
    id: 'newsday', 
    name: 'T&T Newsday', 
    region: 'Trinidad & Tobago',
    style: 'Human interest, community-focused, accessible, "The People\'s Paper"',
    reporters: ['Kiran Maharaj', 'Joel Julien', 'Elizabeth Williams', 'Sean Douglas', 'Paula Lindo']
  },
  { 
    id: 'guardian', 
    name: 'Trinidad Guardian', 
    region: 'Trinidad & Tobago',
    style: 'Traditional, business-oriented, comprehensive, "The Old Lady of St. Vincent Street"',
    reporters: ['Shaliza Hassanali', 'Gail Alexander', 'Charles Kong Soo', 'Radhica De Silva']
  },
  { 
    id: 'express', 
    name: 'Trinidad Express', 
    region: 'Trinidad & Tobago',
    style: 'Investigative, hard-hitting, political commentary, independent',
    reporters: ['Anna Ramdass', 'Ria Taitt', 'Rickie Ramdass', 'Denyse Renne']
  },
  { 
    id: 'ttt', 
    name: 'TTT Live Online', 
    region: 'Trinidad & Tobago',
    style: 'National development, cultural heritage, government-aligned, educational',
    reporters: ['DK Ragnauth', 'Stacy-Ann Providence', 'Mahalia Joseph-Wharton']
  },
  // Regional (Caribbean)
  {
    id: 'gleaner',
    name: 'The Gleaner',
    region: 'Jamaica',
    style: 'Oldest continuously published newspaper in the Western Hemisphere, authoritative, investigative',
    reporters: ['Jovan Johnson', 'Livern Barrett', 'Damion Mitchell']
  },
  {
    id: 'barbadostoday',
    name: 'Barbados Today',
    region: 'Barbados',
    style: 'Digital-first, community-centric, rapid breaking news',
    reporters: ['Marlon Madden', 'Krystal Penny Bowen', 'Emmanuel Joseph']
  },
  {
    id: 'stabroek',
    name: 'Stabroek News',
    region: 'Guyana',
    style: 'Independent, focus on governance, human rights, and regional integration',
    reporters: ['Dhanash Ramroop', 'Thandeka Percival']
  },
  // Global
  {
    id: 'bbc',
    name: 'BBC News',
    region: 'Global/UK',
    style: 'Impartial, global perspective, high production value, public service broadcasting',
    reporters: ['Lyse Doucet', 'Jeremy Bowen', 'Katya Adler']
  },
  {
    id: 'reuters',
    name: 'Reuters',
    region: 'Global',
    style: 'Fact-based, rapid, neutral, financial and political focus',
    reporters: ['Stephen Adler', 'Alessandra Galloni']
  },
  {
    id: 'ap',
    name: 'Associated Press',
    region: 'Global',
    style: 'Standard-setting, objective, widespread distribution',
    reporters: ['Julie Pace', 'Daisy Veerasingham']
  }
];

export default function App() {
  const [view, setView] = useState<'month' | 'week' | 'day' | 'list'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Record<string, Assignment[]>>({});
  const [loading, setLoading] = useState(false);
  const [selectedNewsroom, setSelectedNewsroom] = useState(NEWSROOMS[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [newAssignment, setNewAssignment] = useState<Partial<Assignment>>({
    importance: 'Medium',
    category: 'General'
  });
  const [newsroomStaff, setNewsroomStaff] = useState<Record<string, string[]>>(
    NEWSROOMS.reduce((acc, room) => ({ ...acc, [room.id]: room.reporters }), {})
  );
  const [internalContext, setInternalContext] = useState<string>("");
  const [editorsNotes, setEditorsNotes] = useState<string>("");
  const [longFormIdeas, setLongFormIdeas] = useState<string>("");
  const [reporterStatuses, setReporterStatuses] = useState<Record<string, ReporterStatus>>({});
  const [statusFilter, setStatusFilter] = useState<ReporterStatus | 'All'>('All');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null);

  const selectedDateKey = selectedDate.toISOString().split('T')[0];
  const currentReporters = newsroomStaff[selectedNewsroom.id] || [];
  
  const filterAssignments = (assignments: Assignment[]) => 
    assignments.filter(event => {
      const matchesSearch = 
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.suggestedReporter.toLowerCase().includes(searchTerm.toLowerCase());
      
      const reporterStatus = reporterStatuses[event.suggestedReporter] || 'Available';
      const matchesStatus = statusFilter === 'All' || reporterStatus === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

  const selectedDayEvents = filterAssignments(events[selectedDateKey] || []);

  const updateReporterName = (index: number, newName: string) => {
    setNewsroomStaff(prev => {
      const updated = [...prev[selectedNewsroom.id]];
      updated[index] = newName;
      return { ...prev, [selectedNewsroom.id]: updated };
    });
  };

  const reassignReporter = (dateKey: string, assignmentIdx: number, newReporter: string) => {
    setEvents(prev => {
      const dayEvents = [...(prev[dateKey] || [])];
      if (dayEvents[assignmentIdx]) {
        dayEvents[assignmentIdx] = { ...dayEvents[assignmentIdx], suggestedReporter: newReporter };
      }
      return { ...prev, [dateKey]: dayEvents };
    });
  };

  const deleteAssignment = (dateKey: string, assignmentIdx: number) => {
    setEvents(prev => {
      const dayEvents = [...(prev[dateKey] || [])];
      dayEvents.splice(assignmentIdx, 1);
      return { ...prev, [dateKey]: dayEvents };
    });
    setDeletingIdx(null);
  };

  const syncAssignments = async (range: 'Month' | 'Week' | 'Day') => {
    setLoading(true);
    setError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let timeContext = "";
      if (range === 'Month') {
        const monthName = currentDate.toLocaleString('default', { month: 'long' });
        const year = currentDate.getFullYear();
        timeContext = `the entire month of ${monthName} ${year}`;
      } else if (range === 'Week') {
        const start = new Date(currentDate);
        start.setDate(currentDate.getDate() - currentDate.getDay());
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        timeContext = `the week of ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;
      } else {
        timeContext = `the day of ${selectedDate.toLocaleDateString()}`;
      }

      const prompt = `
        Generate a comprehensive list of news assignments and major events for editors at "${selectedNewsroom.name}" covering Trinidad and Tobago for ${timeContext}.
        
        CRITICAL: The assignments MUST reflect the specific editorial style and perspective of ${selectedNewsroom.name}: ${selectedNewsroom.style}.
        
        Available Reporters for ${selectedNewsroom.name}: ${currentReporters.join(', ')}. 
        Please prefer assigning these reporters to the tasks.
        
        Include:
        1. Major public holidays and cultural festivals.
        2. Expected political announcements or court dates.
        3. Community events and human interest angles.
        
        ${internalContext ? `Incorporate this internal context: "${internalContext}"` : ""}
        ${editorsNotes ? `Editor's Notes & Suggestions: "${editorsNotes}"` : ""}
        ${longFormIdeas ? `Long Form & Feature Ideas to develop: "${longFormIdeas}"` : ""}
        
        For each assignment, provide:
        1. Title: Clear and concise.
        2. Description: Background and coverage angle.
        3. Importance: Scale of High, Medium, or Low.
        4. Suggested Reporter: One of the available reporters listed above.
        5. Category: e.g., Politics, Culture, Crime, Business.
        6. Date: The specific date in YYYY-MM-DD format within the specified time range.
      `;

      const response = await ai.models.generateContent({
        model: GEN_MODEL,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                importance: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                suggestedReporter: { type: Type.STRING },
                category: { type: Type.STRING },
                date: { type: Type.STRING }
              },
              required: ["title", "description", "importance", "suggestedReporter", "category", "date"]
            }
          }
        },
      });

      const result = JSON.parse(response.text || "[]") as Assignment[];
      
      const newEvents = { ...events };
      result.forEach(event => {
        if (!newEvents[event.date]) newEvents[event.date] = [];
        // Avoid duplicates
        if (!newEvents[event.date].some(e => e.title === event.title)) {
          newEvents[event.date].push(event);
        }
      });

      setEvents(newEvents);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error(err);
      setError("Failed to synchronize with news frequencies. Please check connection.");
    } finally {
      setLoading(false);
    }
  };

  const shareBrief = () => {
    const dayEvents = events[selectedDateKey] || [];
    if (dayEvents.length === 0) return;

    const text = dayEvents.map(a => 
      `[${a.importance.toUpperCase()}] ${a.title}\nCategory: ${a.category}\nReporter: ${a.suggestedReporter}\nDescription: ${a.description}\n`
    ).join('\n---\n\n');
    
    navigator.clipboard.writeText(`ASSIGNMENT BRIEF: ${selectedDateKey}\n\n${text}`);
    alert(`Brief for ${selectedDateKey} copied to clipboard.`);
  };

  const addManualAssignment = () => {
    if (!newAssignment.title || !newAssignment.description) return;
    
    const assignment: Assignment = {
      title: newAssignment.title,
      description: newAssignment.description,
      importance: (newAssignment.importance as any) || 'Medium',
      category: newAssignment.category || 'General',
      suggestedReporter: newAssignment.suggestedReporter || (currentReporters[0] || 'Unassigned'),
      date: selectedDateKey
    };

    setEvents(prev => ({
      ...prev,
      [selectedDateKey]: [...(prev[selectedDateKey] || []), assignment]
    }));

    setIsAddingManual(false);
    setNewAssignment({ importance: 'Medium', category: 'General' });
  };

  const fetchSuggestionsForDay = async () => {
    setIsGeneratingSuggestions(true);
    setError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `
        Generate 3-5 specific news assignment suggestions for ${selectedDate.toDateString()} for the "${selectedNewsroom.name}" newsroom.
        Newsroom Style: ${selectedNewsroom.style}
        Region: ${selectedNewsroom.region}
        Available Reporters: ${currentReporters.join(', ')}
        
        Context:
        - Internal Context: ${internalContext}
        - Editor's Notes: ${editorsNotes}
        - Feature Ideas: ${longFormIdeas}
        
        Provide assignments in JSON format with: title, description, importance (High/Medium/Low), suggestedReporter, category, and date (${selectedDateKey}).
      `;

      const response = await ai.models.generateContent({
        model: GEN_MODEL,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                importance: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                suggestedReporter: { type: Type.STRING },
                category: { type: Type.STRING },
                date: { type: Type.STRING }
              },
              required: ["title", "description", "importance", "suggestedReporter", "category", "date"]
            }
          }
        },
      });

      const suggestions = JSON.parse(response.text || "[]") as Assignment[];
      
      setEvents(prev => {
        const existing = prev[selectedDateKey] || [];
        const filtered = suggestions.filter(s => !existing.some(e => e.title === s.title));
        return {
          ...prev,
          [selectedDateKey]: [...existing, ...filtered]
        };
      });
    } catch (err) {
      console.error(err);
      setError("Failed to generate suggestions for this day.");
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  // Calendar Logic
  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Padding for previous month
    for (let i = 0; i < firstDay; i++) {
      const prevDate = new Date(year, month, -i);
      days.unshift({ date: prevDate, currentMonth: false });
    }
    // Current month
    for (let i = 1; i <= totalDays; i++) {
      days.push({ date: new Date(year, month, i), currentMonth: true });
    }
    return days;
  }, [currentDate]);

  const daysInWeek = useMemo(() => {
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - currentDate.getDay());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8 max-w-7xl mx-auto gap-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <CalendarIcon size={18} />
            <span className="text-sm font-semibold uppercase tracking-wider">News Assignment Editor</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{selectedNewsroom.name} Calendar</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 w-full md:w-64">
            <Search size={16} className="text-slate-400" />
            <input 
              type="text"
              placeholder="Search assignments..."
              className="text-sm font-medium outline-none bg-transparent w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
            <Users size={16} className="text-slate-400" />
            <select 
              className="text-sm font-medium outline-none bg-transparent"
              value={selectedNewsroom.id}
              onChange={(e) => {
                const room = NEWSROOMS.find(r => r.id === e.target.value);
                if (room) setSelectedNewsroom(room);
              }}
            >
              {Array.from(new Set(NEWSROOMS.map(r => r.region))).map(region => (
                <optgroup key={region} label={region}>
                  {NEWSROOMS.filter(r => r.region === region).map(room => (
                    <option key={room.id} value={room.id}>{room.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-200 transition-all">
                {view === 'month' && <LayoutGrid size={16} />}
                {view === 'week' && <CalendarIcon size={16} />}
                {view === 'day' && <Clock size={16} />}
                {view === 'list' && <List size={16} />}
                <span className="capitalize">{view} View</span>
                <ChevronDown size={14} />
              </button>
              <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-lg hidden group-hover:block z-50 overflow-hidden">
                <button onClick={() => setView('month')} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs flex items-center gap-2">
                  <LayoutGrid size={14} /> Month
                </button>
                <button onClick={() => setView('week')} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs flex items-center gap-2">
                  <CalendarIcon size={14} /> Week
                </button>
                <button onClick={() => setView('day')} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs flex items-center gap-2">
                  <Clock size={14} /> Day
                </button>
                <button onClick={() => setView('list')} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs flex items-center gap-2">
                  <List size={14} /> List
                </button>
              </div>
            </div>

            <div className="relative group">
              <button 
                disabled={loading}
                className="btn-primary"
              >
                {loading ? <RefreshCw className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                Sync
                <ChevronDown size={14} />
              </button>
              <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-lg hidden group-hover:block z-50 overflow-hidden">
                <button onClick={() => syncAssignments('Month')} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs">Sync Month</button>
                <button onClick={() => syncAssignments('Week')} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs">Sync Week</button>
                <button onClick={() => syncAssignments('Day')} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs">Sync Day</button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar: Context & Tools */}
        <aside className="lg:col-span-3 flex flex-col gap-6">
          <div className="modern-card p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <Users size={16} /> Staff Management
            </h3>
            <div className="flex flex-col gap-2">
              {currentReporters.map((name, idx) => (
                <div key={idx} className="flex flex-col gap-1 p-2 bg-slate-50 border border-slate-200 rounded-lg group">
                  <div className="flex items-center gap-2">
                    <input 
                      type="text"
                      value={name}
                      onChange={(e) => updateReporterName(idx, e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    <button 
                      onClick={() => {
                        setNewsroomStaff(prev => {
                          const updated = [...prev[selectedNewsroom.id]];
                          updated.splice(idx, 1);
                          return { ...prev, [selectedNewsroom.id]: updated };
                        });
                      }}
                      title="Remove staff member"
                      className="p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${
                        (reporterStatuses[name] || 'Available') === 'Available' ? 'bg-emerald-500' :
                        (reporterStatuses[name] || 'Available') === 'Busy' ? 'bg-amber-500' : 'bg-red-500'
                      }`} />
                      <select 
                        className="text-[10px] font-bold text-slate-500 bg-transparent outline-none cursor-pointer"
                        value={reporterStatuses[name] || 'Available'}
                        onChange={(e) => setReporterStatuses(prev => ({ ...prev, [name]: e.target.value as ReporterStatus }))}
                      >
                        <option value="Available">Available</option>
                        <option value="Busy">Busy</option>
                        <option value="On Leave">On Leave</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              <button 
                onClick={() => setNewsroomStaff(prev => ({ ...prev, [selectedNewsroom.id]: [...(prev[selectedNewsroom.id] || []), "New Reporter"] }))}
                className="w-full py-2 border border-dashed border-slate-200 rounded-lg text-[10px] text-slate-400 font-bold uppercase tracking-widest hover:border-blue-300 hover:text-blue-500 transition-all flex items-center justify-center gap-2 mt-2"
              >
                <Plus size={12} /> Add Staff Member
              </button>
            </div>
          </div>

          <div className="modern-card p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <ClipboardList size={16} /> Internal Context
            </h3>
            <textarea 
              className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
              placeholder="Add internal memos, reporter availability, or specific angles..."
              value={internalContext}
              onChange={(e) => setInternalContext(e.target.value)}
            />
          </div>

          <div className="modern-card p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <FileText size={16} /> Editor's Desk
            </h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Notes & Suggestions</label>
                <textarea 
                  className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                  placeholder="General editorial guidance..."
                  value={editorsNotes}
                  onChange={(e) => setEditorsNotes(e.target.value)}
                />
              </div>
              <div className="pt-2 border-t border-slate-100">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block flex items-center gap-1">
                  <Lightbulb size={10} className="text-amber-500" /> Long Form & Feature Ideas
                </label>
                <textarea 
                  className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                  placeholder="Deep dives, investigative pieces..."
                  value={longFormIdeas}
                  onChange={(e) => setLongFormIdeas(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="modern-card p-6 bg-slate-900 text-white">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <Send size={16} /> Distribution
            </h3>
            <p className="text-xs text-slate-300 mb-4">
              Brief for {selectedDateKey}: {(events[selectedDateKey]?.length || 0)} assignments.
            </p>
            <button 
              onClick={shareBrief}
              disabled={!events[selectedDateKey] || loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ClipboardList size={18} />
              Copy Day Brief
            </button>
          </div>

          {error && (
            <div className="modern-card p-4 border-red-100 bg-red-50 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </aside>

        {/* Main Content: Calendar or List */}
        <main className="lg:col-span-9 flex flex-col gap-6">
          {view === 'month' ? (
            <div className="modern-card p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <CalendarIcon className="text-blue-600" />
                  {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    Today
                  </button>
                  <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="bg-slate-50 p-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {day}
                  </div>
                ))}
                {daysInMonth.map(({ date, currentMonth }, idx) => {
                  const key = date.toISOString().split('T')[0];
                  const dayEvents = events[key] || [];
                  const isSelected = key === selectedDateKey;
                  const isToday = key === new Date().toISOString().split('T')[0];

                  return (
                    <div 
                      key={idx} 
                      onClick={() => {
                        setSelectedDate(date);
                        setIsModalOpen(true);
                        setDeletingIdx(null);
                      }}
                      className={`calendar-day ${!currentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                    >
                      <span className={`text-sm font-medium ${isSelected ? 'text-blue-600' : ''}`}>
                        {date.getDate()}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-auto">
                        {filterAssignments(dayEvents).map((e, i) => (
                          <div 
                            key={i} 
                            className={`event-dot ${
                              e.importance === 'High' ? 'bg-rose-500' : 
                              e.importance === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : view === 'week' ? (
            <div className="modern-card p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <CalendarIcon className="text-blue-600" />
                  Week View
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => {
                    const d = new Date(currentDate);
                    d.setDate(d.getDate() - 7);
                    setCurrentDate(d);
                  }} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    Today
                  </button>
                  <button onClick={() => {
                    const d = new Date(currentDate);
                    d.setDate(d.getDate() + 7);
                    setCurrentDate(d);
                  }} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-4">
                {daysInWeek.map((date, idx) => {
                  const key = date.toISOString().split('T')[0];
                  const dayEvents = events[key] || [];
                  const isToday = key === new Date().toISOString().split('T')[0];
                  const isSelected = key === selectedDateKey;

                  return (
                    <div 
                      key={idx}
                      onClick={() => {
                        setSelectedDate(date);
                        setIsModalOpen(true);
                        setDeletingIdx(null);
                      }}
                      className={`modern-card p-4 min-h-[400px] flex flex-col gap-3 cursor-pointer transition-all hover:shadow-md ${isToday ? 'ring-2 ring-blue-500/20 border-blue-500' : ''} ${isSelected ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className="flex flex-col items-center mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{date.toLocaleDateString('default', { weekday: 'short' })}</span>
                        <span className={`text-xl font-bold ${isToday ? 'text-blue-600' : 'text-slate-900'}`}>{date.getDate()}</span>
                      </div>
                      <div className="flex-1 space-y-2 overflow-y-auto max-h-[300px] pr-1">
                        {filterAssignments(dayEvents).map((event, i) => (
                          <div 
                            key={i} 
                            className={`p-2 rounded-lg border text-[10px] font-medium ${
                              event.importance === 'High' ? 'bg-rose-50 border-rose-100 text-rose-700' : 
                              event.importance === 'Medium' ? 'bg-amber-50 border-amber-100 text-amber-700' : 
                              'bg-emerald-50 border-emerald-100 text-emerald-700'
                            }`}
                          >
                            <div className="font-bold truncate">{event.title}</div>
                            <div className="opacity-70 truncate">{event.category}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : view === 'day' ? (
            <div className="modern-card p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <Clock className="text-blue-600" />
                  {selectedDate.toLocaleDateString('default', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() - 1);
                    setSelectedDate(d);
                  }} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={() => setSelectedDate(new Date())} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    Today
                  </button>
                  <button onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() + 1);
                    setSelectedDate(d);
                  }} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              <div className="grid gap-6">
                {filterAssignments(events[selectedDateKey] || []).length > 0 ? (
                  filterAssignments(events[selectedDateKey] || []).map((event, i) => (
                    <div 
                      key={i}
                      onClick={() => {
                        setIsModalOpen(true);
                        setDeletingIdx(null);
                      }}
                      className="modern-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:border-blue-300 transition-all"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`badge-${event.importance.toLowerCase()}`}>{event.importance}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{event.category}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">{event.title}</h3>
                        <p className="text-sm text-slate-500 line-clamp-2">{event.description}</p>
                      </div>
                      <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          <User size={16} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reporter</p>
                          <p className="text-xs font-bold text-slate-700">{event.suggestedReporter}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <CalendarIcon size={48} className="mb-4 opacity-20" />
                    <p className="text-sm font-medium">No assignments scheduled for this day.</p>
                    <button 
                      onClick={() => syncAssignments('Day')}
                      className="mt-4 text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center gap-1"
                    >
                      <RefreshCw size={14} /> Sync Day
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <motion.div 
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid gap-4"
            >
              {/* Date Range Filter */}
              <div className="modern-card p-4 flex flex-wrap items-center gap-4 bg-slate-50 border-slate-200">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter Period:</span>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                  />
                  <span className="text-slate-300">to</span>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-2">
                  <Users size={16} className="text-slate-400" />
                  <select 
                    className="text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Available">Available Only</option>
                    <option value="Busy">Busy Only</option>
                    <option value="On Leave">On Leave Only</option>
                  </select>
                </div>

                {(startDate || endDate || statusFilter !== 'All') && (
                  <button 
                    onClick={() => { setStartDate(""); setEndDate(""); setStatusFilter('All'); }}
                    className="text-[10px] font-bold text-blue-600 uppercase hover:underline"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              {(Object.entries(events) as [string, Assignment[]][])
                .filter(([date]) => {
                  if (startDate && date < startDate) return false;
                  if (endDate && date > endDate) return false;
                  return true;
                })
                .map(([date, dayEvents]) => [date, filterAssignments(dayEvents)] as [string, Assignment[]])
                .filter(([_, dayEvents]) => dayEvents.length > 0)
                .sort()
                .map(([date, dayEvents]) => (
                <div key={date} className="flex flex-col gap-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <CalendarIcon size={12} /> {date}
                  </h3>
                  <div className="grid gap-3">
                    {dayEvents.map((event, i) => (
                      <div 
                        key={i} 
                        onClick={() => {
                          setSelectedDate(new Date(date));
                          setIsModalOpen(true);
                          setDeletingIdx(null);
                        }}
                        className="modern-card p-4 flex justify-between items-center cursor-pointer hover:border-blue-300 transition-all"
                      >
                        <div>
                          <h4 className="font-bold text-slate-900">{event.title}</h4>
                          <p className="text-xs text-slate-500">{event.category} • {event.suggestedReporter}</p>
                        </div>
                        <span className={`badge-${event.importance.toLowerCase()}`}>
                          {event.importance}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </main>
      </div>

      {/* Sidebar Modal for Day Details */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsModalOpen(false);
                setDeletingIdx(null);
              }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-1">Assignment Details</span>
                  <h3 className="text-xl font-bold text-slate-900">
                    {selectedDate.toLocaleDateString('default', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </h3>
                </div>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setDeletingIdx(null);
                  }}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {selectedDayEvents.length} Assignments & Suggestions
                  </span>
                  <div className="flex gap-2">
                    {!isAddingManual && (
                      <button 
                        onClick={() => setIsAddingManual(true)}
                        className="text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center gap-1"
                      >
                        <Plus size={14} /> Add Manual
                      </button>
                    )}
                    <button 
                      onClick={fetchSuggestionsForDay}
                      disabled={isGeneratingSuggestions}
                      className="text-emerald-600 hover:text-emerald-700 text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                    >
                      {isGeneratingSuggestions ? <RefreshCw size={14} className="animate-spin" /> : <Lightbulb size={14} />}
                      AI Suggestions
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <AnimatePresence>
                    {isAddingManual && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="modern-card p-5 border-blue-200 bg-blue-50/30 overflow-hidden"
                      >
                        <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                          <Plus size={16} className="text-blue-600" /> New Assignment
                        </h4>
                        <div className="space-y-3">
                          <input 
                            type="text" 
                            placeholder="Assignment Title"
                            className="w-full p-2 text-sm border border-slate-200 rounded outline-none focus:border-blue-500"
                            value={newAssignment.title || ''}
                            onChange={e => setNewAssignment({...newAssignment, title: e.target.value})}
                          />
                          <textarea 
                            placeholder="Description & Angle"
                            className="w-full p-2 text-sm border border-slate-200 rounded outline-none focus:border-blue-500 h-20 resize-none"
                            value={newAssignment.description || ''}
                            onChange={e => setNewAssignment({...newAssignment, description: e.target.value})}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <select 
                              className="p-2 text-xs border border-slate-200 rounded outline-none"
                              value={newAssignment.importance}
                              onChange={e => setNewAssignment({...newAssignment, importance: e.target.value as any})}
                            >
                              <option value="High">High Priority</option>
                              <option value="Medium">Medium Priority</option>
                              <option value="Low">Low Priority</option>
                            </select>
                            <input 
                              type="text" 
                              placeholder="Category"
                              className="p-2 text-xs border border-slate-200 rounded outline-none"
                              value={newAssignment.category}
                              onChange={e => setNewAssignment({...newAssignment, category: e.target.value})}
                            />
                          </div>
                          <select 
                            className="w-full p-2 text-xs border border-slate-200 rounded outline-none"
                            value={newAssignment.suggestedReporter}
                            onChange={e => setNewAssignment({...newAssignment, suggestedReporter: e.target.value})}
                          >
                            <option value="">Select Reporter</option>
                            {currentReporters.map(r => (
                              <option key={r} value={r}>
                                {r} — {reporterStatuses[r] || 'Available'}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-2 pt-2">
                            <button 
                              onClick={addManualAssignment}
                              className="flex-1 bg-blue-600 text-white py-2 rounded text-xs font-bold hover:bg-blue-700"
                            >
                              Save Assignment
                            </button>
                            <button 
                              onClick={() => setIsAddingManual(false)}
                              className="px-4 py-2 border border-slate-200 rounded text-xs font-bold text-slate-500 hover:bg-slate-100"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {selectedDayEvents.length ? (
                    selectedDayEvents.map((item, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="modern-card p-5 group border-slate-200 relative overflow-hidden"
                      >
                        <AnimatePresence>
                          {deletingIdx === idx && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-4 text-center"
                            >
                              <AlertCircle className="text-red-500 mb-2" size={24} />
                              <h3 className="text-sm font-bold text-slate-900 mb-1">Delete Assignment?</h3>
                              <p className="text-[10px] text-slate-500 mb-4">This action cannot be undone.</p>
                              <div className="flex gap-2 w-full">
                                <button 
                                  onClick={() => deleteAssignment(selectedDateKey, idx)}
                                  className="flex-1 bg-red-600 text-white py-2 rounded-lg text-[10px] font-bold hover:bg-red-700"
                                >
                                  Yes, Delete
                                </button>
                                <button 
                                  onClick={() => setDeletingIdx(null)}
                                  className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg text-[10px] font-bold hover:bg-slate-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`badge-${item.importance.toLowerCase()}`}>
                              {item.importance}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {item.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={18} className="text-slate-200 group-hover:text-blue-500 transition-colors" />
                            <button 
                              onClick={() => setDeletingIdx(idx)}
                              className="text-slate-200 hover:text-red-500 transition-colors"
                              title="Delete Assignment"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                        <h2 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h2>
                        <p className="text-sm text-slate-600 mb-4 leading-relaxed">{item.description}</p>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                          <div className="flex items-center gap-2 text-slate-700">
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                <User size={16} />
                              </div>
                              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                (reporterStatuses[item.suggestedReporter] || 'Available') === 'Available' ? 'bg-emerald-500' :
                                (reporterStatuses[item.suggestedReporter] || 'Available') === 'Busy' ? 'bg-amber-500' : 'bg-red-500'
                              }`} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Assigned To</span>
                              <select 
                                className="text-sm font-semibold bg-transparent outline-none cursor-pointer hover:text-blue-600 transition-colors"
                                value={item.suggestedReporter}
                                onChange={(e) => reassignReporter(selectedDateKey, idx, e.target.value)}
                              >
                                <option value={item.suggestedReporter}>
                                  {item.suggestedReporter} ({(reporterStatuses[item.suggestedReporter] || 'Available')})
                                </option>
                                {currentReporters.filter(r => r !== item.suggestedReporter).map(reporter => (
                                  <option key={reporter} value={reporter}>
                                    {reporter} ({(reporterStatuses[reporter] || 'Available')})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <BarChart3 size={16} className="text-slate-200" />
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="h-48 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50">
                      <CalendarIcon size={32} className="mb-2 opacity-20" />
                      <p className="text-sm italic">No assignments scheduled for this date.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50">
                <button 
                  onClick={shareBrief}
                  disabled={selectedDayEvents.length === 0}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send size={18} />
                  Share Daily Briefing
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <footer className="mt-auto pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 text-xs text-center md:text-left">
        <div className="flex flex-col gap-1">
          <p>© 2026 News Assignment Editor • Port of Spain</p>
          <p className="font-medium text-slate-500">Created by Trinidad and Tobago's Melissa Doughty</p>
        </div>
        <div className="flex gap-6">
          {lastUpdated && <span>System Sync: {lastUpdated}</span>}
          <a href="#" className="hover:text-blue-600 transition-colors">Support</a>
        </div>
      </footer>
    </div>
  );
}
