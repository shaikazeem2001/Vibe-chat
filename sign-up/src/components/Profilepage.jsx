import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, TrendingUp, Users, MessageSquare, Plus, X, Globe, Lock, Copy, CheckCircle2, Loader2, Ghost, Search, Compass, PackageOpen, Sparkles, PenLine } from "lucide-react";
import axios from "../api/Axios";


const Profilepage = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");
  const isGuest = localStorage.getItem("isGuest") === "true";
  const [joinedCommunities, setJoinedCommunities] = useState([]);
  const [trendingCommunities, setTrendingCommunities] = useState([]);

  useEffect(() => {
    const communities = JSON.parse(localStorage.getItem("joinedCommunities") || "[]");
    setJoinedCommunities(communities);

    // Fetch real trending communities
    const fetchTrending = async () => {
      try {
        const res = await axios.get("/api/rooms");

        // Take top 3 rooms and map with appropriate static branding icons for now
        const items = res.data.slice(0, 3).map((room, index) => {
          let icon;
          if (index === 0) icon = <svg viewBox="0 0 118 103" className="w-8 h-8 fill-current text-[#61DAFB]"><path d="M59 103c-32.6 0-59-23.1-59-51.5S26.4 0 59 0s59 23.1 59 51.5-26.4 51.5-59 51.5zM59 4.3C28.8 4.3 4.3 25.5 4.3 51.5S28.8 98.7 59 98.7s54.7-21.2 54.7-47.2S89.2 4.3 59 4.3z" /><path d="M59 69.8c-10.1 0-18.3-8.2-18.3-18.3S48.9 33.2 59 33.2s18.3 8.2 18.3 18.3S69.1 69.8 59 69.8zM59 37.5c-7.7 0-14 6.3-14 14s6.3 14 14 14 14-6.3 14-14-6.3-14-14-14z" /><ellipse transform="rotate(-60 59 51.5)" cx="59" cy="51.5" rx="55.8" ry="17.4" /><ellipse transform="rotate(60 59 51.5)" cx="59" cy="51.5" rx="55.8" ry="17.4" /></svg>;
          else if (index === 1) icon = <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current text-[#38BDF8]"><path d="M12.001,4.8c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624C13.666,10.618,15.027,12,18.001,12c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624C16.337,6.182,14.976,4.8,12.001,4.8z M6.001,12c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624c1.177,1.194,2.538,2.576,5.512,2.576c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624C10.337,13.382,8.976,12,6.001,12z" /></svg>;
          else icon = <div className="w-8 h-8 rounded bg-[#F7DF1E] text-black flex items-center justify-center font-bold text-sm">JS</div>;

          return {
            id: room.id,
            name: room.name,
            members: room.participants ? room.participants.length : Math.floor(Math.random() * 500) + 120, // display actual members if structure allows, else fake
            icon
          };
        });
        setTrendingCommunities(items);
      } catch (e) {
        console.warn("Failed to fetch trending communities");
      }
    };
    fetchTrending();
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCommunity, setNewCommunity] = useState({ name: "", description: "", isPrivate: false });
  const [isLoading, setIsLoading] = useState(false);
  const [createdRoom, setCreatedRoom] = useState(null);

  const handleCreateCommunity = async () => {
    if (isGuest) return alert("Guests cannot create communities. Please sign in!");
    if (!newCommunity.name.trim()) return alert("Please enter a community name");
    setIsLoading(true);
    try {
      const res = await axios.post(`/api/rooms`, newCommunity);

      // Update local joined communities
      const updated = [res.data, ...joinedCommunities];
      setJoinedCommunities(updated);
      localStorage.setItem("joinedCommunities", JSON.stringify(updated));

      if (newCommunity.isPrivate) {
        setCreatedRoom(res.data);
      } else {
        setIsModalOpen(false);
        setNewCommunity({ name: "", description: "", isPrivate: false });
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create community");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (e) {
      console.warn("Logout error:", e);
    }
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className="max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 px-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight transition-colors">
            Welcome back, {username}! {isGuest && <span className="text-xs bg-iris-50 dark:bg-iris-600/30 text-iris-600 dark:text-iris-400 px-2 py-0.5 rounded-full ml-2 align-middle font-normal uppercase tracking-wider border border-iris-500/30">Guest Mode</span>}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base italic transition-colors">
            {isGuest ? "You are exploring as a guest. Sign in to join communities!" : "Check out what's happening in your communities."}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg transition-colors border border-gray-300 dark:border-gray-700"
        >
          <LogOut size={18} />
          Logout
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content: Joined Communities */}
        <div className="lg:col-span-2 space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users size={20} className="text-iris-500" />
              Your Communities
            </h2>
            {joinedCommunities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {joinedCommunities.map((community, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-xl hover:border-iris-500/50 transition-all cursor-pointer group" onClick={() => {
                    localStorage.setItem("room", community.id);
                    navigate(`/communities/${community.id}`);
                  }}>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-iris-500 transition-colors">{community.name}</h3>
                      <div className="flex gap-2 items-center">
                        <span className={`text-[10px] px-2 py-1 rounded font-bold tracking-wide uppercase transition-colors ${community.is_private ? 'bg-iris-500/10 text-iris-600 dark:text-iris-400 border border-iris-500/20' : 'bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent'}`}>
                          {community.is_private ? 'Private' : 'Public'}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 transition-colors mb-3">{community.description}</p>
                    
                    {community.is_private && community.invite_code && (
                      <div 
                        className="flex items-center justify-between bg-gray-100 dark:bg-black p-2 rounded-lg border border-gray-200 dark:border-gray-800 mt-2 hover:bg-gray-200 dark:hover:bg-gray-800/50 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(community.invite_code);
                          alert("Invite code copied to clipboard!");
                        }}
                      >
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Invite Code:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-iris-600 dark:text-iris-400 font-bold tracking-widest">{community.invite_code}</span>
                          <Copy size={14} className="text-gray-400 transition-colors" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-[#0C0A15] border border-gray-200 dark:border-slate-800/80 rounded-2xl p-8 shadow-sm flex flex-col md:flex-row items-center justify-center md:gap-12 transition-all">
                <div className="relative mb-6 md:mb-0">
                  <div className="absolute inset-0 bg-iris-500/10 blur-3xl rounded-full"></div>
                  <div className="relative flex items-center justify-center p-2 rounded-full drop-shadow-lg">
                    {/* Detailed Ghost Illustration SVG */}
                    <svg width="140" height="140" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g filter="url(#filter0_d)">
                        <path d="M100 40C70 40 50 65 50 95V145C50 150 55.5 153.5 60 151L70 145L80 151C85 154 95 154 100 151L110 145L120 151C125 154 135 154 140 151L150 145C154.5 153.5 150 150 150 145V95C150 65 130 40 100 40Z" fill="#F8FAFC" />
                        <path d="M75 80C75 85.5228 70.5228 90 65 90C59.4772 90 55 85.5228 55 80C55 74.4772 59.4772 70 65 70C70.5228 70 75 74.4772 75 80Z" fill="#1E293B" />
                        <path d="M115 80C115 85.5228 110.523 90 105 90C99.4772 90 95 85.5228 95 80C95 74.4772 99.4772 70 105 70C110.523 70 115 74.4772 115 80Z" fill="#1E293B" />
                        <path d="M85 110C85 118 92 120 100 120C108 120 115 118 115 110" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
                        {/* Magnifying Glass */}
                        <circle cx="140" cy="80" r="18" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="6" />
                        <path d="M154 94L168 108" stroke="#94A3B8" strokeWidth="8" strokeLinecap="round" />
                        {/* Compass */}
                        <circle cx="50" cy="115" r="18" fill="#FDE68A" stroke="#D97706" strokeWidth="6" />
                        <path d="M50 104L53 115L61 118L53 121L50 132L47 121L39 118L47 115L50 104Z" fill="#EF4444" />
                      </g>
                      <defs>
                        <filter id="filter0_d" x="25" y="25" width="160" height="150" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                          <feDropShadow dx="0" dy="10" stdDeviation="10" floodOpacity="0.15" />
                        </filter>
                      </defs>
                    </svg>
                  </div>
                </div>
                <div className="text-center md:text-left flex flex-col items-center md:items-start">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Your communities are empty.</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 max-w-[220px] md:max-w-[280px]">The next great one could be yours.<br />Explore new worlds!</p>
                  <button
                    onClick={() => navigate('/join')}
                    className="font-bold text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 cursor-pointer transition-colors flex items-center gap-1"
                  >
                    Explore Communities →
                  </button>
                </div>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MessageSquare size={20} className="text-blue-500" />
              Recent Conversations
            </h2>
            <div className="bg-gray-50 dark:bg-[#0C0A15] border border-gray-200 dark:border-slate-800/80 rounded-2xl p-8 py-12 shadow-sm flex flex-col items-center justify-center gap-6 transition-all text-center">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/10 blur-2xl rounded-full"></div>
                <div className="relative flex flex-col items-center">
                  <Sparkles size={24} className="text-gray-400 absolute -top-5 -right-3 animate-pulse" />
                  <PackageOpen size={64} className="text-gray-400 dark:text-slate-500 drop-shadow-lg" />
                </div>
              </div>
              <div className="flex flex-col items-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Your conversations are clean.</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">Initiate a conversation.</p>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar: Trending / Suggestions */}
        <div className="space-y-6">
          <section className="bg-gray-50 dark:bg-[#0C0A15] border border-gray-200 dark:border-slate-800/80 rounded-2xl p-6 transition-colors shadow-sm">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <TrendingUp size={20} className="text-emerald-500" />
              Trending Communities
            </h2>
            <div className="space-y-4">
              {trendingCommunities.length > 0 ? trendingCommunities.map((item) => (
                <div key={item.id} onClick={() => { localStorage.setItem("room", item.id); navigate(`/communities/${item.id}`); }} className="flex justify-between items-center group cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800/40 p-2 -mx-2 rounded-xl transition-all">
                  <div className="flex items-center gap-3">
                    <div className="text-gray-400 flex-shrink-0 drop-shadow-md">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{item.name}</p>
                      <p className="text-xs font-medium text-gray-500 dark:text-slate-500 transition-colors">{item.members} members</p>
                    </div>
                  </div>
                  <button className="text-[11px] font-bold text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:group-hover:text-white dark:hover:bg-slate-700/60 border border-gray-200 dark:border-slate-700 px-3 py-1.5 rounded-full transition-colors">
                    View
                  </button>
                </div>
              )) : (
                <p className="text-sm text-gray-500 italic p-2 text-center">Loading trends...</p>
              )}
            </div>
            <button onClick={() => navigate('/exploretopics')} className="w-full mt-6 text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors border-t border-gray-200 dark:border-slate-700/60 pt-4">
              Show More
            </button>
          </section>

          <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-[#2B1B54] dark:from-[#2B1B54] dark:to-[#4A3B8C] border border-indigo-500/20 rounded-2xl p-6 text-white text-center shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl"></div>
            <h3 className="font-bold text-xl mb-2 tracking-tight">Create your own!</h3>
            <p className="text-sm text-indigo-200/80 dark:text-purple-200/80 mb-6 px-1">Want to start a new community? Lead the way and build something great.</p>
            <button
              onClick={() => {
                if (isGuest) {
                  alert("Please login to create a community!");
                  navigate("/");
                } else {
                  setIsModalOpen(true);
                }
              }}
              className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-3 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-colors flex items-center justify-center gap-2"
            >
              <PenLine size={16} />
              Start a Community 🚀
            </button>
          </div>
        </div>
      </div>

      {/* Create Community Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200 transition-colors">
            {createdRoom ? (
              <div className="text-center py-4">
                <div className="flex justify-center mb-6">
                  <div className="bg-green-500/20 p-4 rounded-full text-green-500">
                    <CheckCircle2 size={48} />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">Community Created!</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 transition-colors">Share this invite code with your friends to join your private room.</p>

                <div className="bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 p-4 rounded-2xl flex items-center justify-between mb-8 group cursor-pointer transition-colors" onClick={() => {
                  navigator.clipboard.writeText(createdRoom.invite_code);
                  alert("Invite code copied!");
                }}>
                  <span className="text-xl font-mono font-bold text-iris-600 dark:text-iris-400 tracking-wider uppercase transition-colors">{createdRoom.invite_code}</span>
                  <Copy size={20} className="text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
                </div>

                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setCreatedRoom(null);
                    setNewCommunity({ name: "", description: "", isPrivate: false });
                  }}
                  className="w-full bg-iris-600 hover:bg-iris-500 text-white font-bold py-4 rounded-2xl transition-all"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight transition-colors">New Community</h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest px-1">Community Name</label>
                    <input
                      type="text"
                      placeholder="e.g. PixelArt Enthusiasts"
                      className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white px-4 py-4 rounded-2xl focus:outline-none focus:border-iris-500 transition-all font-medium"
                      value={newCommunity.name}
                      onChange={(e) => setNewCommunity({ ...newCommunity, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest px-1">Description (Optional)</label>
                    <textarea
                      placeholder="What is this community about?"
                      className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white px-4 py-4 rounded-2xl focus:outline-none focus:border-iris-500 transition-all font-medium h-24 resize-none"
                      value={newCommunity.description}
                      onChange={(e) => setNewCommunity({ ...newCommunity, description: e.target.value })}
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest px-1">Visibility</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setNewCommunity({ ...newCommunity, isPrivate: false })}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${!newCommunity.isPrivate ? "bg-iris-50 dark:bg-iris-600/10 border-iris-500 text-iris-600 dark:text-white" : "bg-gray-50 dark:bg-black border-gray-200 dark:border-gray-800 text-gray-500 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900"}`}
                      >
                        <Globe size={20} />
                        <span className="text-xs font-bold uppercase tracking-tight">Public</span>
                      </button>
                      <button
                        onClick={() => setNewCommunity({ ...newCommunity, isPrivate: true })}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${newCommunity.isPrivate ? "bg-iris-50 dark:bg-iris-600/10 border-iris-500 text-iris-600 dark:text-white" : "bg-gray-50 dark:bg-black border-gray-200 dark:border-gray-800 text-gray-500 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900"}`}
                      >
                        <Lock size={20} />
                        <span className="text-xs font-bold uppercase tracking-tight">Private</span>
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleCreateCommunity}
                    disabled={isLoading}
                    className="w-full bg-iris-600 hover:bg-iris-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-iris-600/20 active:scale-[0.98] flex items-center justify-center gap-3 mt-4 disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                    CREATE COMMUNITY
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Profilepage;
