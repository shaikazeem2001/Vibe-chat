import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Plus, Key, ArrowRight, ShieldCheck, Loader2, Globe, X, Copy, CheckCircle2 } from "lucide-react";
import axios from "../api/Axios";
import { usePrivateRooms } from "../api/hooks";
import { ConvListSkeleton } from "./Skeletons";


const PrivateRooms = () => {
    const navigate = useNavigate();
    const { data: rooms = [], isLoading: roomsLoading } = usePrivateRooms();
    const [roomName, setRoomName] = useState("");
    const [roomCode, setRoomCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newCommunity, setNewCommunity] = useState({ name: "", description: "", isPrivate: false });
    const [createdRoom, setCreatedRoom] = useState(null);
    const isGuest = localStorage.getItem("isGuest") === "true";

    const joinRoomByCode = async () => {
        if (!roomCode.trim()) return;
        setIsLoading(true);
        try {
            const res = await axios.post(`/api/rooms/join/invite`, { inviteCode: roomCode });

            // Add to joined communities in localStorage
            const joined = JSON.parse(localStorage.getItem("joinedCommunities") || "[]");
            if (!joined.find(c => c._id === res.data.room._id)) {
                joined.push(res.data.room);
                localStorage.setItem("joinedCommunities", JSON.stringify(joined));
            }

            setRooms(prev => [...prev.filter(r => r._id !== res.data.room._id), res.data.room]);
            setRoomCode("");
            alert("Successfully joined room!");
            navigate(`/communities/${res.data.room.id || res.data.room.name}`);
        } catch (err) {
            alert(err.response?.data?.message || "Failed to join room");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateCommunity = async () => {
        if (isGuest) return alert("Guests cannot create communities. Please sign in!");
        if (!newCommunity.name.trim()) return alert("Please enter a community name");
        setIsLoading(true);
        try {
            const res = await axios.post(`/api/rooms`, newCommunity);

            // Update local joined communities
            const joined = JSON.parse(localStorage.getItem("joinedCommunities") || "[]");
            const updated = [res.data, ...joined];
            localStorage.setItem("joinedCommunities", JSON.stringify(updated));

            // If it was private, update our local room list too
            if (newCommunity.isPrivate) {
                setRooms(prev => [res.data, ...prev]);
                setCreatedRoom(res.data);
            } else {
                setIsModalOpen(false);
                setNewCommunity({ name: "", description: "", isPrivate: false });
                alert("Public community created! You can find it in the Join Communities section.");
            }
        } catch (err) {
            alert(err.response?.data?.message || "Failed to create community");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 md:px-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2 flex items-center gap-3 transition-colors">
                        <Lock className="text-iris-600 dark:text-iris-500 transition-colors" size={32} />
                        Private Rooms
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 transition-colors">Secure spaces for your private and exclusive conversations.</p>
                </div>
                <button
                    onClick={() => navigate('/profile')}
                    className="bg-iris-600 hover:bg-iris-500 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-iris-600/20"
                >
                    <Plus size={20} />
                    New Community
                </button>
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* List of joined private rooms */}
                <section>
                    <h2 className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-4 px-1">Your Rooms</h2>
                    <div className="space-y-4">
                        {roomsLoading ? (
                            <ConvListSkeleton count={3} />
                        ) : rooms.length > 0 ? (
                            rooms.map((room) => (
                                <div
                                    key={room.id}
                                    onClick={() => navigate(`/communities/${room.id}`)}
                                    className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl hover:border-iris-500/50 transition-all cursor-pointer group flex flex-col gap-3"
                                >
                                    <div className="flex justify-between items-center w-full">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-iris-50 dark:bg-iris-600/10 rounded-xl flex items-center justify-center text-iris-600 dark:text-iris-500 transition-colors">
                                                <ShieldCheck size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-iris-600 dark:group-hover:text-iris-500 transition-colors">{room.name}</h3>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-500 flex items-center gap-1 uppercase tracking-tight font-black transition-colors">
                                                    Private Member
                                                </p>
                                            </div>
                                        </div>
                                        <ArrowRight size={20} className="text-gray-400 dark:text-gray-700 group-hover:text-iris-600 dark:group-hover:text-iris-500 transform group-hover:translate-x-1 transition-all" />
                                    </div>
                                    {room.invite_code && (
                                        <div 
                                            className="flex items-center justify-between bg-gray-100 dark:bg-black p-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-200 dark:hover:bg-gray-800/50 transition-colors mt-2"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigator.clipboard.writeText(room.invite_code);
                                                alert("Invite code copied to clipboard!");
                                            }}
                                        >
                                            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Invite Code:</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-iris-600 dark:text-iris-400 font-bold tracking-widest">{room.invite_code}</span>
                                                <Copy size={14} className="text-gray-400 transition-colors" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl p-10 text-center transition-colors">
                                <p className="text-gray-500 dark:text-gray-600 italic transition-colors">No private rooms joined yet.</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 bg-gradient-to-br from-iris-600 to-iris-800 rounded-3xl p-8 text-white shadow-xl shadow-iris-600/20">
                        <h3 className="font-black text-2xl mb-2 tracking-tight">Create your own!</h3>
                        <p className="text-iris-100 mb-6 text-sm leading-relaxed">Want to start a new community? Lead the way and build something great.</p>
                        <button
                            onClick={() => {
                                if (isGuest) {
                                    alert("Please login to create a community!");
                                    navigate("/");
                                } else {
                                    setIsModalOpen(true);
                                }
                            }}
                            className="w-full bg-white text-iris-600 font-black py-4 rounded-2xl hover:bg-iris-50 shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Plus size={20} />
                            START A COMMUNITY
                        </button>
                    </div>
                </section>

                {/* Join by code section */}
                <section className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 md:p-10 flex flex-col justify-center h-fit sticky top-8 transition-colors">

                    <div className="mb-8">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 flex items-center gap-2 transition-colors">
                            <Key size={24} className="text-iris-600 dark:text-iris-500 transition-colors" />
                            Join via Private ID
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic transition-colors">Have an invitation code? Enter it below to join a secure room instantly.</p>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 dark:text-gray-500 uppercase tracking-[0.2em] px-1 transition-colors">Invite Code</label>
                            <input
                                type="text"
                                placeholder="e.g. A1B2C3"
                                className="w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-5 text-center text-2xl font-black tracking-[0.3em] text-gray-900 dark:text-white focus:outline-none focus:border-iris-500 transition-all uppercase placeholder:tracking-normal placeholder:opacity-20 shadow-inner"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value)}
                                maxLength={6}
                            />
                        </div>
                        <button
                            onClick={joinRoomByCode}
                            disabled={isLoading}
                            className="w-full bg-iris-600 text-white font-black py-4 rounded-2xl hover:bg-iris-500 transition-all flex items-center justify-center gap-3 group shadow-lg shadow-iris-600/20 active:scale-95 disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Key size={20} />}
                            JOIN PRIVATE ROOM
                        </button>
                    </div>

                    <div className="mt-10 p-5 bg-iris-600/5 rounded-2xl border border-iris-600/10">
                        <p className="text-[10px] text-iris-400/80 text-center leading-relaxed font-bold uppercase tracking-wider">
                            Private rooms are restricted to invited members only. Respect the privacy of the room.
                        </p>
                    </div>
                </section>
            </div>

            {/* Create Community Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
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

export default PrivateRooms;
