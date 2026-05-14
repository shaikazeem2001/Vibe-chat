import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Hash, LogIn } from 'lucide-react';
import {
  useCreateChatClient,
  Chat,
  Channel,
  ChannelHeader,
  MessageInput,
  MessageList,
  Thread,
  Window,
  useMessageContext
} from 'stream-chat-react';
import 'stream-chat-react/dist/css/v2/index.css';
import Avatar from 'react-nice-avatar';
import axios from "../api/Axios";
import MessageSearch from './MessageSearch';
import { extractPublicId, avatarUrl as cldAvatarUrl } from '../utils/cloudinary';

const apiKey = import.meta.env.VITE_STREAM_API_KEY;
const userToken = import.meta.env.VITE_STREAM_USER_TOKEN;

// Custom Avatar Component to handle Hybrid Avatar types (Supabase Images OR Memojis) injected into Stream messages
const CustomAvatar = ({ user, name }) => {
  const [senderAvatar, setSenderAvatar] = useState(null);

  useEffect(() => {
    const config = user?.avatarConfig || user?.custom?.avatarConfig;
    if (config) {
      setSenderAvatar(config);
    } else if (user?.id && user.id !== "guest_user") {
      const fetchAvatar = async () => {
        try {
          const res = await axios.get(`/api/auth/user/${user.id}`);
          if (res.data?.avatarConfig) {
            setSenderAvatar(res.data.avatarConfig);
          }
        } catch (e) {
          console.log("Fallback avatar fetch failed:", e.message);
        }
      };
      fetchAvatar();
    }
  }, [user]);

  if (senderAvatar) {
    if (senderAvatar.isCustomImage && senderAvatar.url) {
      // Attempt to serve via Cloudinary transforms (f_auto, q_auto, face-crop)
      const publicId = extractPublicId(senderAvatar.url);
      const optimisedSrc = publicId ? cldAvatarUrl(publicId, 80) : senderAvatar.url;
      return (
        <div className="w-10 h-10 rounded-full shadow-lg border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 shrink-0 mx-1 overflow-hidden object-cover flex items-center justify-center">
          <img
            src={optimisedSrc}
            alt="User Avatar"
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      );
    } else {
      return (
        <div className="w-10 h-10 rounded-full shadow-lg bg-gray-800 shrink-0 mx-1 relative overflow-hidden">
          <Avatar className="w-full h-full" {...senderAvatar} />
        </div>
      );
    }
  }

  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-inner bg-gradient-to-br from-iris-400 to-iris-600 text-white shrink-0 mx-1">
      {name?.[0]?.toUpperCase() || user?.id?.[0]?.toUpperCase() || '?'}
    </div>
  );
};


const ChatUI = () => {
  const { id: communityId, roomId } = useParams();
  const navigate = useNavigate();
  const [channel, setChannel] = useState(undefined);
  const isGuest = localStorage.getItem("isGuest") === "true";
  const [appTheme, setAppTheme] = useState(() => document.documentElement.classList.contains("dark") ? "str-chat__theme-dark" : "str-chat__theme-light");
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          const isDark = document.documentElement.classList.contains("dark");
          setAppTheme(isDark ? "str-chat__theme-dark" : "str-chat__theme-light");
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Initialize as undefined rather than null to satisfy Stream React hook type checking
  const [streamUser, setStreamUser] = useState(undefined);
  const [dynamicToken, setDynamicToken] = useState(undefined);

  const activeRoom = communityId || roomId || "general";
  const isPrivate = !!roomId;

  // Sync our local user with Stream
  useEffect(() => {
    // Safety timeout — if auth hasn't resolved in 12s, show error instead of infinite spinner
    const timeoutId = setTimeout(() => {
      setAuthError('Connection timed out. The backend may be unreachable.');
    }, 12000);

    if (isGuest) {
      const initGuest = async () => {
        const guestId = localStorage.getItem("userId") || 'guest_user';
        try {
          const tokenRes = await axios.post("/api/auth/guest-stream-token", { guestId });
          setStreamUser({
            id: tokenRes.data.userId,
            name: localStorage.getItem("username") || 'Guest',
          });
          setDynamicToken(tokenRes.data.token);
        } catch (err) {
          console.warn("Generating Guest Token Failed. Falling back to static.", err);
          // Static fallback — still lets the guest see the UI if VITE_STREAM_USER_TOKEN is set
          if (userToken) {
            setStreamUser({ id: guestId, name: localStorage.getItem("username") || 'Guest' });
            setDynamicToken(userToken);
          } else {
            setAuthError('Could not authenticate guest session. Please try refreshing.');
          }
        } finally {
          clearTimeout(timeoutId);
        }
      };
      initGuest();
      return () => clearTimeout(timeoutId);
    }

    const fetchUserAndToken = async () => {
      try {
        console.log('[ChatUI] Fetching user profile...');
        const res = await axios.get("/api/auth/profile");
        const u = res.data.user;
        console.log('[ChatUI] Profile OK, fetching Stream token...');

        const mappedUser = {
          id: u.id,
          name: u.username,
          avatarConfig: u.avatarConfig || undefined,
        };

        let fetchedToken = userToken; // Fallback
        try {
          const tokenRes = await axios.get("/api/auth/stream-token");
          fetchedToken = tokenRes.data.token;
          mappedUser.id = tokenRes.data.userId;
          console.log('[ChatUI] Stream token received.');
        } catch (tokenErr) {
          const status = tokenErr?.response?.status;
          const hint = tokenErr?.response?.data?.hint;
          if (status === 503) {
            // Credentials not configured — surface as a hard error, not a silent fallback
            setAuthError(hint || 'Stream API credentials are not configured on the server. Add STREAM_API_KEY and STREAM_API_SECRET to Backend/.env');
            return;
          }
          console.warn("Failed to fetch dynamic Stream token. Falling back to static.", tokenErr);
          mappedUser.id = "throbbing-sky-5";
        }

        if (!fetchedToken) {
          // Both dynamic token and static fallback are undefined — can't connect
          setAuthError('Stream API key is not configured. Add VITE_STREAM_API_KEY and VITE_STREAM_USER_TOKEN to your .env.local file.');
          return;
        }

        setStreamUser(mappedUser);
        setDynamicToken(fetchedToken);
      } catch (err) {
        console.error('[ChatUI] Auth failed:', err);
        // ── FIX: was silently swallowed, leaving streamUser undefined forever ──
        const msg = err?.response?.status === 401
          ? 'Session expired. Please log in again.'
          : 'Could not reach the server. Check your backend is running.';
        setAuthError(msg);
      } finally {
        clearTimeout(timeoutId);
      }
    };
    fetchUserAndToken();
    return () => clearTimeout(timeoutId);
  }, [isGuest]);

  // ── Error state: show instead of infinite spinner ──
  if (authError) {
    return (
      <div className="flex flex-col h-[80vh] bg-gray-50/50 dark:bg-gray-950/50 rounded-3xl border border-gray-200/50 dark:border-gray-800/50 shadow-2xl items-center justify-center text-gray-900 dark:text-white w-full max-w-6xl mx-auto transition-colors duration-300 gap-4 p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 text-2xl">✕</div>
        <p className="text-gray-600 dark:text-gray-300 font-medium max-w-sm">{authError}</p>
        <div className="flex gap-3">
          <button
            onClick={() => { setAuthError(null); window.location.reload(); }}
            className="bg-iris-600 hover:bg-iris-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            Retry
          </button>
          <button
            onClick={() => navigate('/')}
            className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!streamUser || !dynamicToken) {
    return (
      <div className="flex flex-col h-[80vh] bg-gray-50/50 dark:bg-gray-950/50 rounded-3xl border border-gray-200/50 dark:border-gray-800/50 shadow-2xl items-center justify-center text-gray-900 dark:text-white w-full max-w-6xl mx-auto animate-pulse transition-colors duration-300">
        <div className="w-12 h-12 border-4 border-iris-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400 font-medium transition-colors">Authenticating chat session...</p>
      </div>
    );
  }

  return (
    <ChatUIContent
      streamUser={streamUser}
      dynamicToken={dynamicToken}
      activeRoom={activeRoom}
      isPrivate={isPrivate}
      appTheme={appTheme}
      navigate={navigate}
      isGuest={isGuest}
    />
  );
};

const ChatUIContent = ({ streamUser, dynamicToken, activeRoom, isPrivate, appTheme, navigate, isGuest }) => {
  const [channel, setChannel] = useState(undefined);

  const client = useCreateChatClient({
    apiKey,
    tokenOrProvider: dynamicToken,
    userData: streamUser,
  });

  useEffect(() => {
    if (!client) return;

    // Stream Channel IDs cannot contain certain characters like ":"
    const sanitizedId = activeRoom.replace(/[^a-zA-Z0-9_\-]/g, '_');

    const newChannel = client.channel('messaging', sanitizedId, {
      name: `Room: ${activeRoom}`,
      members: [streamUser.id],
    });

    setChannel(newChannel);
  }, [client, activeRoom, streamUser]);

  // Loading state guard (ensuring channel instantiation has occurred)
  if (!client || !channel) {
    return (
      <div className="flex flex-col h-[80vh] bg-gray-50/50 dark:bg-gray-950/50 rounded-3xl border border-gray-200/50 dark:border-gray-800/50 shadow-2xl items-center justify-center text-gray-900 dark:text-white w-full max-w-6xl mx-auto animate-pulse transition-colors duration-300">
        <div className="w-12 h-12 border-4 border-iris-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400 font-medium transition-colors">Connecting to channel...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[85vh] bg-white dark:bg-gray-950 rounded-3xl overflow-hidden shadow-2xl w-full max-w-6xl mx-auto text-gray-900 dark:text-white border border-gray-200/50 dark:border-gray-800/50 transition-colors duration-300">
      {/* Header */}
      <div className="flex justify-between items-center px-4 md:px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0 z-10 shadow-lg transition-colors duration-300">
        <div className="flex items-center gap-4 overflow-hidden">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="bg-iris-600/20 p-2.5 rounded-xl text-iris-500 shadow-inner">
            {isPrivate ? <Shield size={20} /> : <Hash size={20} />}
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-black text-gray-900 dark:text-white capitalize tracking-wide flex items-center gap-2 transition-colors">
              <span className="text-iris-500/80 text-[10px] font-black bg-iris-500/10 px-2 py-0.5 rounded border border-iris-500/20 uppercase tracking-widest hidden md:inline-block">
                Community
              </span>
              {activeRoom}
            </h2>
            <p className="text-xs text-green-500 flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              Connected via Stream
            </p>
          </div>
        </div>

        {/* Message Search */}
        <MessageSearch
          roomId={activeRoom}
          onSelectHit={(hit) => console.log('Jump to message:', hit.objectID)}
          className="hidden md:block"
        />
      </div>

      {/* Stream Chat Area */}
      <div className="flex-1 overflow-hidden layout-stream-chat str-chat relative">
        <Chat client={client} theme={appTheme}>
          <Channel channel={channel} Avatar={CustomAvatar}>
            <Window>
              <MessageList
                customMessageActions={
                  isGuest ? {} // Guests can't block/flag
                    : {
                      Block: (message) => {
                        if (window.confirm("Are you sure you want to block this user? They will no longer be able to message you directly.")) {
                          client.blockUser(message.user.id)
                            .then(() => alert("User blocked successfully."))
                            .catch(() => alert("Failed to block user."));
                        }
                      },
                      Report: (message) => {
                        if (window.confirm("Flag this message/user for moderation review?")) {
                          client.flagMessage(message.id)
                            .then(() => alert("Message reported. Our moderation team will review it."))
                            .catch(() => alert("Failed to flag message."));
                        }
                      }
                    }
                }
              />
              {isGuest ? (
                <div className="p-4 bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-200/50 dark:border-gray-800/50 flex flex-col items-center transition-colors">
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-3 transition-colors">Guests cannot type in this channel.</p>
                  <button onClick={() => navigate("/")} className="bg-iris-600/20 text-iris-400 px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-iris-600/30 transition-colors">
                    <LogIn size={14} /> Sign In
                  </button>
                </div>
              ) : (
                <MessageInput />
              )}
            </Window>
            <Thread />
          </Channel>
        </Chat>
      </div>

      <style>{`
        .layout-stream-chat {
          display: flex;
          height: 100%;
          width: 100%;
        }
        .layout-stream-chat .str-chat__channel-list {
          width: 30%;
        }
        .layout-stream-chat .str-chat__channel {
          width: 100%;
        }
        .layout-stream-chat .str-chat__thread {
          width: 45%;
        }
        .str-chat__header-hamburger {
          display: none !important;
        }
        .str-chat__list {
          background-color: transparent !important;
          scrollbar-width: thin;
          scrollbar-color: #3f3f46 #18181b;
        }
        .str-chat__input-flat {
          background: rgba(17, 24, 39, 0.5) !important;
          border-top: 1px solid rgba(31, 41, 55, 0.5) !important;
          padding: 1rem 1.5rem !important;
        }
        .str-chat__input-flat-wrapper {
          background: rgba(31, 41, 55, 0.8) !important;
          border-radius: 1rem !important;
          border: 1px solid rgba(55, 65, 81, 0.5) !important;
        }
      `}</style>
    </div>
  );
};

export default ChatUI;
