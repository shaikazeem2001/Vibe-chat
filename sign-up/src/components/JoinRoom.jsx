import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Users } from "lucide-react";
import { TopicGridSkeleton } from "./Skeletons";

const JoinRoom = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Simulate network load — replace with useQuery when backed by API
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  const communities = [
    { id: 'coding', name: 'Coding', description: 'Everything about software development, from web to mobile.', members: '1.2M' },
    { id: 'travel', name: 'Travel', description: 'Share your adventures and get travel tips from around the world.', members: '850k' },
    { id: 'startups', name: 'Startups', description: 'The place for entrepreneurs to discuss ideas and growth.', members: '420k' },
    { id: 'gaming', name: 'Gaming', description: 'Latest news, reviews, and community discussions about games.', members: '2.5M' },
    { id: 'music', name: 'Music', description: 'Discover new artists and discuss your favorite genres.', members: '1.8M' },
    { id: 'photography', name: 'Photography', description: 'Share your shots and learn photography techniques.', members: '300k' },
  ];

  const handleJoin = (community) => {
    const joined = JSON.parse(localStorage.getItem("joinedCommunities") || "[]");
    if (!joined.find(c => c.id === community.id)) {
      joined.push(community);
      localStorage.setItem("joinedCommunities", JSON.stringify(joined));
    }
    localStorage.setItem("room", community.id);
    navigate(`/communities/${community.id}`);
  };

  const filteredCommunities = communities.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-10 text-center px-4">
        <h1 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 tracking-tight transition-colors">Discover Communities</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm md:text-lg italic font-medium transition-colors">Find your people and start chatting in real-time.</p>
      </div>

      <div className="relative mb-12">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 transition-colors" size={20} />
        <input
          type="text"
          placeholder="Search for interests, topics, or communities..."
          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:border-iris-500 transition-colors shadow-xl"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <TopicGridSkeleton count={6} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCommunities.map((community) => (
              <div key={community.id} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 flex flex-col hover:border-iris-500/50 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-gray-200 dark:bg-gray-800 p-3 rounded-xl text-iris-600 dark:text-iris-500 transition-colors">
                    <Users size={24} />
                  </div>
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-500 bg-gray-200 dark:bg-black px-3 py-1 rounded-full border border-gray-300 dark:border-gray-800 transition-colors">
                    {community.members} members
                  </span>
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-iris-500 transition-colors uppercase tracking-tight">
                  r/{community.id}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 flex-1 italic line-clamp-2 transition-colors">
                  "{community.description}"
                </p>

                <button
                  onClick={() => handleJoin(community)}
                  className="w-full bg-gray-900 dark:bg-white text-white dark:text-black font-bold py-3 rounded-xl hover:bg-iris-500 dark:hover:bg-iris-500 hover:text-white dark:hover:text-white transition-all transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Join Community
                </button>
              </div>
            ))}
          </div>

          {filteredCommunities.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-500 dark:text-gray-500 text-xl italic transition-colors">No communities found matching your search. Why not create one?</p>
              <button
                onClick={() => navigate('/profile')}
                className="mt-6 bg-iris-50 dark:bg-iris-600/10 text-iris-600 dark:text-iris-400 border border-iris-500/30 px-8 py-3 rounded-xl font-bold hover:bg-iris-600 hover:text-white transition-all shadow-lg shadow-iris-600/20"
              >
                Create Custom Community
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default JoinRoom;

