import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Zap,
  Palette,
  Cpu,
  Shirt,
  Film,
  Gamepad2,
  Utensils,
  Search,
  TrendingUp,
  Compass
} from "lucide-react";
import { TopicGridSkeleton } from "./Skeletons";

const Exploretopics = () => {
  const navigate = useNavigate();
  const fullRoom = localStorage.getItem("room") || "General";
  const baseCommunity = fullRoom.includes(":") ? fullRoom.split(":")[0] : fullRoom;
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const topics = [
    { id: "anime", name: "Anime", icon: <Zap size={24} />, color: "text-yellow-400", bg: "bg-yellow-400/10", desc: "Latest series, discussions, and fan art." },
    { id: "art", name: "Art", icon: <Palette size={24} />, color: "text-purple-400", bg: "bg-purple-400/10", desc: "Digital, traditional, and abstract expressions." },
    { id: "technology", name: "Technology", icon: <Cpu size={24} />, color: "text-blue-400", bg: "bg-blue-400/10", desc: "Gadgets, coding, and the future of AI." },
    { id: "fashion", name: "Fashion", icon: <Shirt size={24} />, color: "text-pink-400", bg: "bg-pink-400/10", desc: "Style trends, brand drops, and outfit inspo." },
    { id: "movies", name: "Movies", icon: <Film size={24} />, color: "text-red-400", bg: "bg-red-400/10", desc: "Blockbusters, indies, and cinematic reviews." },
    { id: "games", name: "Games", icon: <Gamepad2 size={24} />, color: "text-green-400", bg: "bg-green-400/10", desc: "Competitive play, consoles, and indie gems." },
    { id: "food", name: "Food", icon: <Utensils size={24} />, color: "text-orange-400", bg: "bg-orange-400/10", desc: "Recipes, restaurant reviews, and food photography." },
  ];

  const joinTopic = (topic) => {
    const finalRoom = `${baseCommunity}:${topic}`;
    localStorage.setItem("room", finalRoom);
    navigate(`/chat/${finalRoom}`);
  };

  const filteredTopics = topics.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto py-4 md:py-8 px-4">
      {/* Hero Section */}
      <div className="mb-12 relative overflow-hidden bg-white dark:bg-gradient-to-r dark:from-gray-900 dark:to-black p-6 md:p-10 rounded-[32px] border border-gray-200 dark:border-gray-800 shadow-2xl transition-colors">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Compass className="text-iris-600 dark:text-iris-500 animate-pulse transition-colors" size={20} />
            <span className="text-[10px] font-bold text-iris-600 dark:text-iris-500 uppercase tracking-[0.2em] transition-colors">Discovery Mode</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 leading-tight transition-colors">
            Explore What's <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-iris-500 to-iris-700 dark:from-iris-400 dark:to-iris-600">Trending Now</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm md:text-lg mb-8 leading-relaxed transition-colors">
            Dive into specialized topics<span className="text-gray-900 dark:text-white font-bold transition-colors"></span>. Join the conversation and connect with like-minded people.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Search for a topic..."
              className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-700/50 text-gray-900 dark:text-white pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:border-iris-500/50 transition-all backdrop-blur-md"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Background elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-iris-600/10 rounded-full blur-3xl"></div>
      </div>

      {/* Grid Header */}
      <div className="flex justify-between items-center mb-8 px-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3 transition-colors">
          <TrendingUp size={24} className="text-green-500" />
          Active Sub-channels
        </h2>
        <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-colors">{filteredTopics.length} Topics Found</span>
      </div>

      {/* Topic Grid */}
      {isLoading ? (
        <TopicGridSkeleton count={6} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTopics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => joinTopic(topic.id)}
                className="group relative flex flex-col items-start p-8 bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-3xl text-left hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-all duration-300 shadow-xl overflow-hidden active:scale-[0.98]"
              >
                {/* Hover Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-black/5 dark:from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div className={`p-4 rounded-2xl mb-6 ${topic.bg} ${topic.color} transition-transform group-hover:scale-110 duration-500`}>
                  {topic.icon}
                </div>

                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight group-hover:text-iris-600 dark:group-hover:text-iris-400 transition-colors">
                  {topic.name}
                </h3>
                <p className="text-gray-500 dark:text-gray-500 text-sm leading-relaxed mb-6 transition-colors">
                  {topic.desc}
                </p>

                <div className="mt-auto flex items-center gap-2 text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                  <span>Enter Channel</span>
                  <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full transition-colors"></span>
                  <span className="text-green-500">Active</span>
                </div>
              </button>
            ))}
          </div>

          {filteredTopics.length === 0 && (
            <div className="text-center py-20 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl bg-gray-50 dark:bg-gray-900/10 transition-colors">
              <p className="text-gray-600 dark:text-gray-500 text-xl font-medium mb-2 transition-colors">No matches found for "{searchTerm}"</p>
              <p className="text-gray-500 dark:text-gray-600 text-sm transition-colors">Try searching for popular topics like Anime, Technology or Movies.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Exploretopics;
