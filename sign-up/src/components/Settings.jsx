import React, { useState, useEffect } from "react";
import { User, Mail, Lock, Settings as SettingsIcon, Save, LogOut, CheckCircle2, Loader2, Moon, Sun, Bell, Shield, Palette, RefreshCw } from "lucide-react";
import axios from "../api/Axios";
import { useNavigate } from "react-router-dom";
import Avatar, { genConfig } from "react-nice-avatar";
import { useProfile } from "../api/hooks";
import { ProfileSkeleton } from "./Skeletons";

const Settings = () => {
    const navigate = useNavigate();
    const isGuest = localStorage.getItem("isGuest") === "true";
    const storedUser = localStorage.getItem("username");
    const storedUserId = localStorage.getItem("userId");

    const [activeTab, setActiveTab] = useState("profile");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });

    // Profile State
    const [username, setUsername] = useState(storedUser || "");
    const [email, setEmail] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");

    // Avatar Settings State
    const [avatarTab, setAvatarTab] = useState("upload");
    const [avatarConfig, setAvatarConfig] = useState(genConfig());
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);

    // Settings State
    const [theme, setTheme] = useState("dark");
    const [notifications, setNotifications] = useState(true);
    const [privacy, setPrivacy] = useState("friends");

    // React Query profile — replaces manual fetchProfile useEffect
    const { data: profileData, isLoading: profileLoading } = useProfile();

    useEffect(() => {
        if (!profileData) return;
        setUsername(profileData.username);
        setEmail(profileData.email);
        if (profileData.avatarConfig) {
            setAvatarConfig(profileData.avatarConfig);
            if (profileData.avatarConfig.isCustomImage) {
                setAvatarTab("upload");
            } else {
                setAvatarTab("memoji");
            }
        }
        if (profileData.settings) {
            const userTheme = profileData.settings.theme || "dark";
            setTheme(userTheme);
            localStorage.setItem("theme", userTheme);
            if (userTheme === "dark") {
                document.documentElement.classList.add("dark");
            } else {
                document.documentElement.classList.remove("dark");
            }
            setNotifications(profileData.settings.notifications);
            setPrivacy(profileData.settings.privacy || "friends");
        }
    }, [profileData]);

    const handleSaveProfile = async () => {
        if (isGuest) {
            showMessage("Guests cannot save profile changes.", "error");
            return;
        }
        setIsLoading(true);
        try {
            await axios.put("/api/auth/profile", {
                username,
                currentPassword,
                newPassword
            });
            localStorage.setItem("username", username);
            showMessage("Profile updated successfully!", "success");
            setCurrentPassword("");
            setNewPassword("");
        } catch (err) {
            showMessage(err.response?.data?.message || "Failed to update profile", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveAvatarAndSettings = async () => {
        if (isGuest) {
            showMessage("Guests cannot save settings.", "error");
            return;
        }
        setIsLoading(true);
        try {
            if (avatarTab === "upload" && avatarFile) {
                const formData = new FormData();
                formData.append('avatarData', avatarFile);

                const uploadRes = await axios.post("/api/auth/profile/avatar", formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                if (uploadRes.data.avatarConfig) {
                    setAvatarConfig(uploadRes.data.avatarConfig);
                }

                await axios.put("/api/auth/profile", {
                    settings: { theme, notifications, privacy }
                });
            } else if (avatarTab === "memoji") {
                const memojiConfig = { ...avatarConfig, isCustomImage: false };
                await axios.put("/api/auth/profile", {
                    avatarConfig: memojiConfig,
                    settings: { theme, notifications, privacy }
                });
                setAvatarConfig(memojiConfig);
            } else {
                await axios.put("/api/auth/profile", {
                    settings: { theme, notifications, privacy }
                });
            }

            localStorage.setItem("theme", theme);
            if (theme === "dark") {
                document.documentElement.classList.add("dark");
            } else {
                document.documentElement.classList.remove("dark");
            }
            showMessage("Settings & Avatar saved successfully!", "success");
            setAvatarFile(null); // Clear pending file state
        } catch (err) {
            showMessage(err.response?.data?.message || "Failed to save settings", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                showMessage("File is too large. Max size is 5MB.", "error");
                return;
            }
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: "", type: "" }), 3000);
    };

    const handleLogout = async () => {
        try {
            await axios.post('/api/auth/logout');
        } catch (e) {
            console.warn("Logout error:", e);
        }
        localStorage.clear();
        document.documentElement.classList.add("dark"); // Default back to dark for logins
        navigate("/");
    };

    const handleDeleteAccount = async () => {
        if (isGuest) {
            showMessage("Guests cannot delete their temporary accounts here.", "error");
            return;
        }

        const confirmDelete = window.confirm(
            "Are you absolutely sure you want to delete your account? This will permanently erase your profile, messages, and communities you own. This action CANNOT be undone."
        );

        if (!confirmDelete) return;

        setIsLoading(true);
        try {
            await axios.delete("/api/auth/profile");
            localStorage.clear();
            document.documentElement.classList.add("dark");
            navigate("/");
            alert("Your account has been permanently deleted.");
        } catch (err) {
            showMessage(err.response?.data?.message || "Failed to delete account.", "error");
            setIsLoading(false);
        }
    };

    const randomizeAvatar = () => {
        setAvatarConfig(genConfig());
    };

    // Avatar Options with User-Friendly Labels
    const hairStyles = [
        { value: "normal", label: "Short Normal" },
        { value: "thick", label: "Short Thick" },
        { value: "mohawk", label: "Mohawk" },
        { value: "womanLong", label: "Long Flowing" },
        { value: "womanShort", label: "Shoulder Length" }
    ];
    const faceShapes = [
        { value: "circle", label: "Round Face" },
        { value: "rounded", label: "Oval Face" },
        { value: "square", label: "Square Face" }
    ];
    const eyeStyles = [
        { value: "circle", label: "Wide Eyes" },
        { value: "oval", label: "Almond Eyes" },
        { value: "smile", label: "Smiling Eyes" }
    ];
    const mouthStyles = [
        { value: "laugh", label: "Laughing Open" },
        { value: "smile", label: "Gentle Smile" },
        { value: "peace", label: "Neutral / Peaceful" }
    ];
    const skinColors = ["#f8d25c", "#ffdbac", "#f1c27d", "#e0ac69", "#8d5524", "#c68642"];

    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="mb-8 pl-2">
                <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3 transition-colors">
                    <SettingsIcon className="text-iris-500" size={32} />
                    Settings
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2 transition-colors">Manage your account, customize your Memoji, and adjust preferences.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Sidebar Nav */}
                <div className="space-y-2">
                    <button
                        onClick={() => setActiveTab("profile")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === "profile" ? "bg-iris-50 dark:bg-iris-600/20 text-iris-600 dark:text-iris-500 border border-iris-500/20" : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white"}`}
                    >
                        <User size={20} />
                        Edit Profile
                    </button>
                    <button
                        onClick={() => setActiveTab("avatar")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === "avatar" ? "bg-iris-50 dark:bg-iris-600/20 text-iris-600 dark:text-iris-500 border border-iris-500/20" : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white"}`}
                    >
                        <Palette size={20} />
                        Memoji Avatar
                    </button>
                    <button
                        onClick={() => setActiveTab("account")}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeTab === "account" ? "bg-iris-50 dark:bg-iris-600/20 text-iris-600 dark:text-iris-500 border border-iris-500/20" : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white"}`}
                    >
                        <Shield size={20} />
                        Preferences
                    </button>

                    <div className="pt-8 mt-8 border-t border-gray-200 dark:border-gray-800 transition-colors">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-500/10 transition-all"
                        >
                            <LogOut size={20} />
                            Logout
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="md:col-span-3 bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 backdrop-blur-xl transition-colors">

                    {message.text && (
                        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 font-medium ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                            <CheckCircle2 size={20} />
                            {message.text}
                        </div>
                    )}

                    {/* PROFILE SECTION */}
                    {activeTab === "profile" && (
                        profileLoading && !isGuest ? (
                            <ProfileSkeleton />
                        ) : (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-4 transition-colors">Personal Information</h2>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Username</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                                        <input
                                            type="text"
                                            className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-iris-500 transition-all font-medium"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            disabled={isGuest}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Email (Read Only)</label>
                                    <div className="relative opacity-70">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                                        <input
                                            type="email"
                                            className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white pl-12 pr-4 py-3 rounded-xl cursor-not-allowed font-medium"
                                            value={email || "guest@hexabyte.app"}
                                            disabled
                                        />
                                    </div>
                                </div>
                            </div>

                            {!isGuest && (
                                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800 transition-colors">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 transition-colors">Change Password</h3>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Current Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                            <input
                                                type="password"
                                                className="w-full bg-black border border-gray-800 text-white pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-iris-500 transition-all font-medium"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">New Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                            <input
                                                type="password"
                                                className="w-full bg-black border border-gray-800 text-white pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-iris-500 transition-all font-medium"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 flex justify-end">
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={isLoading || isGuest}
                                    className="bg-iris-600 hover:bg-iris-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg flex items-center gap-2 group disabled:opacity-50"
                                >
                                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                    Save Profile
                                </button>
                            </div>
                        </div>
                        )
                    )}

                    {/* AVATAR SECTION */}
                    {activeTab === "avatar" && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="border-b border-gray-200 dark:border-gray-800 pb-4 transition-colors">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white transition-colors">Avatar Configuration</h2>
                                <p className="text-sm text-gray-500 mt-1">Choose between uploading a custom image or generating a Memoji.</p>
                            </div>

                            {/* Sub-tab Toggle */}
                            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                                <button
                                    onClick={() => setAvatarTab("upload")}
                                    className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${avatarTab === "upload" ? "bg-white dark:bg-black text-iris-600 dark:text-iris-500 shadow-sm shadow-black/5" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"}`}
                                >
                                    Upload Image
                                </button>
                                <button
                                    onClick={() => setAvatarTab("memoji")}
                                    className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${avatarTab === "memoji" ? "bg-white dark:bg-black text-iris-600 dark:text-iris-500 shadow-sm shadow-black/5" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"}`}
                                >
                                    Generate Memoji
                                </button>
                            </div>

                            {avatarTab === "upload" ? (
                                <div className="flex flex-col md:flex-row gap-8 items-start animate-in fade-in slide-in-from-right-4 duration-300">
                                    {/* Live Preview */}
                                    <div className="flex flex-col items-center gap-4 bg-gray-50/50 dark:bg-black/50 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shrink-0 w-full md:w-auto transition-colors">
                                        <div className="w-40 h-40 rounded-full shadow-2xl shadow-iris-500/20 bg-gray-800 overflow-hidden border-4 border-white dark:border-gray-900 flex items-center justify-center">
                                            {avatarPreview ? (
                                                <img src={avatarPreview} alt="Pending Avatar Upload" className="w-full h-full object-cover" />
                                            ) : (avatarConfig?.url && avatarConfig.isCustomImage) ? (
                                                <img src={avatarConfig.url} alt="Current Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={64} className="text-gray-500" />
                                            )}
                                        </div>
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{avatarPreview ? "New Avatar Preview" : "Current Avatar"}</span>
                                    </div>

                                    {/* Controls */}
                                    <div className="flex-1 w-full space-y-6">
                                        <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-iris-500 dark:hover:border-iris-400 bg-gray-50 dark:bg-gray-900/50 rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className="w-16 h-16 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-full flex items-center justify-center text-gray-400 group-hover:text-iris-500 group-hover:scale-110 shadow-lg mb-4 transition-all">
                                                <Palette size={28} />
                                            </div>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white mb-1 group-hover:text-iris-500 transition-colors">Click or drag image to upload</p>
                                            <p className="text-xs text-gray-500">Supports JPG, PNG, WEBP</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col md:flex-row gap-8 items-start animate-in fade-in slide-in-from-left-4 duration-300">
                                    {/* Memoji Live Preview */}
                                    <div className="flex flex-col items-center gap-4 bg-gray-50/50 dark:bg-black/50 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shrink-0 w-full md:w-auto transition-colors">
                                        <div className="w-40 h-40 rounded-full shadow-2xl shadow-iris-500/20 bg-gray-800 relative group overflow-hidden">
                                            <Avatar className="w-full h-full active:scale-95 transition-transform" {...avatarConfig} />
                                            <button onClick={randomizeAvatar} className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-sm font-bold tracking-wider">RANDOMIZE</span>
                                            </button>
                                        </div>
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Live Preview</span>
                                    </div>

                                    {/* Memoji Controls */}
                                    <div className="flex-1 w-full space-y-6">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Skin Tone</label>
                                                <button onClick={randomizeAvatar} className="text-xs font-bold text-iris-600 dark:text-iris-400 hover:text-iris-500 transition-colors flex items-center gap-1 uppercase tracking-widest">
                                                    <RefreshCw size={14} />
                                                    Randomize
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {skinColors.map(color => (
                                                    <button
                                                        key={color}
                                                        onClick={() => setAvatarConfig({ ...avatarConfig, faceColor: color, isCustomImage: false })}
                                                        className={`w-8 h-8 rounded-full border-2 transition-all ${avatarConfig.faceColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                                                        style={{ backgroundColor: color }}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Hair Style</label>
                                                <select
                                                    className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:border-iris-500 font-medium appearance-none transition-colors"
                                                    value={avatarConfig.hairStyle}
                                                    onChange={(e) => setAvatarConfig({ ...avatarConfig, hairStyle: e.target.value, isCustomImage: false })}
                                                >
                                                    {hairStyles.map(style => <option key={style.value} value={style.value}>{style.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Face Shape</label>
                                                <select
                                                    className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:border-iris-500 font-medium appearance-none transition-colors"
                                                    value={avatarConfig.shape}
                                                    onChange={(e) => setAvatarConfig({ ...avatarConfig, shape: e.target.value, isCustomImage: false })}
                                                >
                                                    {faceShapes.map(style => <option key={style.value} value={style.value}>{style.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Eyes</label>
                                                <select
                                                    className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:border-iris-500 font-medium appearance-none transition-colors"
                                                    value={avatarConfig.eyeStyle}
                                                    onChange={(e) => setAvatarConfig({ ...avatarConfig, eyeStyle: e.target.value, isCustomImage: false })}
                                                >
                                                    {eyeStyles.map(style => <option key={style.value} value={style.value}>{style.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Expression (Mouth)</label>
                                                <select
                                                    className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white px-4 py-3 rounded-xl outline-none focus:border-iris-500 font-medium appearance-none transition-colors"
                                                    value={avatarConfig.mouthStyle}
                                                    onChange={(e) => setAvatarConfig({ ...avatarConfig, mouthStyle: e.target.value, isCustomImage: false })}
                                                >
                                                    {mouthStyles.map(style => <option key={style.value} value={style.value}>{style.label}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 flex justify-end gap-4 border-t border-gray-200 dark:border-gray-800 transition-colors">
                                <button
                                    onClick={handleSaveAvatarAndSettings}
                                    disabled={isLoading || isGuest || (avatarTab === "upload" && !avatarFile && !avatarConfig?.isCustomImage)}
                                    className="bg-iris-600 hover:bg-iris-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg flex items-center gap-2 group disabled:opacity-50"
                                >
                                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                    Apply Changes
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ACCOUNT SETTINGS SECTION */}
                    {activeTab === "account" && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-4 transition-colors">Application Preferences</h2>

                            <div className="space-y-6">
                                {/* Theme Toggle */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-iris-600/20 text-iris-500 flex items-center justify-center">
                                            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white transition-colors">App Theme</h3>
                                            <p className="text-sm text-gray-500">Switch between light and dark modes.</p>
                                        </div>
                                    </div>
                                    <div className="flex bg-gray-200 dark:bg-gray-900 rounded-xl p-1 border border-gray-300 dark:border-gray-800 transition-colors">
                                        <button onClick={() => { setTheme('light'); document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${theme === 'light' ? 'bg-white text-black shadow' : 'text-gray-500 hover:text-white dark:hover:text-gray-300'}`}>Light</button>
                                        <button onClick={() => { setTheme('dark'); document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); }} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${theme === 'dark' ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-white dark:hover:text-gray-300'}`}>Dark</button>
                                    </div>
                                </div>

                                {/* Notifications Toggle */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center">
                                            <Bell size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white transition-colors">Push Notifications</h3>
                                            <p className="text-sm text-gray-500">Receive alerts for new messages.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setNotifications(!notifications)}
                                        className={`w-12 h-6 rounded-full transition-all relative ${notifications ? 'bg-iris-500' : 'bg-gray-700'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${notifications ? 'left-7' : 'left-1'}`}></div>
                                    </button>
                                </div>

                                {/* Privacy Select */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">
                                            <Shield size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white transition-colors">Profile Privacy</h3>
                                            <p className="text-sm text-gray-500">Who can see your online status.</p>
                                        </div>
                                    </div>
                                    <select
                                        value={privacy}
                                        onChange={(e) => setPrivacy(e.target.value)}
                                        className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm font-bold px-4 py-2 rounded-lg outline-none cursor-pointer transition-colors"
                                    >
                                        <option value="public">Everyone</option>
                                        <option value="friends">Friends Only</option>
                                        <option value="private">Nobody</option>
                                    </select>
                                </div>
                                {/* Danger Zone: Account Deletion */}
                                <div className="mt-8 pt-6 border-t border-red-500/20">
                                    <h3 className="font-black text-red-500 mb-2 uppercase tracking-widest text-sm">Danger Zone</h3>
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 bg-red-500/5 border border-red-500/20 rounded-2xl transition-colors gap-4">
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white">Delete Account</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                                                Permanently erase your profile, messages, and communities. This cannot be undone.
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleDeleteAccount}
                                            disabled={isLoading || isGuest}
                                            className="whitespace-nowrap bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                                        >
                                            Delete Account
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end border-t border-gray-200 dark:border-gray-800 transition-colors">
                                <button
                                    onClick={handleSaveAvatarAndSettings}
                                    disabled={isLoading || isGuest}
                                    className="bg-iris-600 hover:bg-iris-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg flex items-center gap-2 group disabled:opacity-50"
                                >
                                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                    Save Preferences
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default Settings;
