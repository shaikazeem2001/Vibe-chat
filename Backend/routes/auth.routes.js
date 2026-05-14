const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { StreamChat } = require("stream-chat");
const multer = require("multer");
const { authLimiter, uploadLimiter } = require("../middleware/rateLimit.middleware");
const { generateToken, sendPasswordResetEmail, sendVerificationEmail } = require("../config/email");

// Configure Multer for processing file upload buffers locally
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// signup routes
router.post("/signup", async (req, res) => {
  if (!process.env.JWT_SECRET) {
    console.error("CRITICAL ERROR: JWT_SECRET is not defined in environment variables.");
    return res.status(500).json({ message: "Server configuration error" });
  }

  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ message: "User already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        { username, email, password: hashedPassword }
      ])
      .select()
      .single();

    if (insertError) {
      console.error("Supabase Insert Error:", insertError);
      return res.status(500).json({ message: "Failed to create user", error: insertError.message });
    }

    // Send email verification (non-blocking — don't fail signup if email errors)
    try {
      const verifyToken = generateToken();
      const verifyExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('auth_tokens').insert([
        { token: verifyToken, user_id: newUser.id, type: 'email_verify', expires_at: verifyExpiresAt, used: false }
      ]);
      await sendVerificationEmail(newUser.username, newUser.email, verifyToken);
    } catch (emailErr) {
      console.error("Verification email failed (non-fatal):", emailErr.message);
    }

    return res.status(201).json({
      message: "User registered successfully. Please check your email to verify your account.",
    });

  } catch (error) {
    console.error("Signup Error Detailed:", error);
    return res.status(500).json({ 
      message: "Server error", 
      error: error.message
    });
  }
});

// middleware route 
const authMiddleware = require("../middleware/auth.middleware");

router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, avatar')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ message: "User not found" });
    }

    let avatarConfig = null;
    let settings = null;
    try {
      if (user.avatar) {
          // Check if it's the new combined format or the old format
          const parsed = JSON.parse(user.avatar);
          if (parsed.avatarConfig || parsed.settings) {
              avatarConfig = parsed.avatarConfig || null;
              settings = parsed.settings || null;
          } else {
              // Legacy format
              avatarConfig = parsed;
          }
      }
    } catch (e) {
      console.warn("Could not parse json", e);
    }

    res.json({
      message: "Protected data accessed",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarConfig,
        settings
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Fetch another user's public info (e.g. for chat avatars)
router.get("/user/:id", authMiddleware, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('username, avatar')
      .eq('id', req.params.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ message: "User not found" });
    }

    let avatarConfig = null;
    try {
      if (user.avatar) {
          const parsed = JSON.parse(user.avatar);
          if (parsed.avatarConfig || parsed.settings) {
              avatarConfig = parsed.avatarConfig || null;
          } else {
              avatarConfig = parsed;
          }
      }
    } catch (e) { }

    res.json({
      username: user.username,
      avatarConfig
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { username, currentPassword, newPassword, avatarConfig, settings } = req.body;
    let updateData = {};

    if (username) updateData.username = username;

    // Fetch user first to get existing avatar/settings data
    const { data: existingUser } = await supabase
      .from('users')
      .select('avatar, password')
      .eq('id', req.user.id)
      .single();

    // Handle avatar & settings combining into existing column
    if (avatarConfig || settings) {
        let currentCombined = {};
        try {
            if (existingUser?.avatar) {
               const parsed = JSON.parse(existingUser.avatar);
               if (parsed.avatarConfig || parsed.settings) {
                   currentCombined = parsed;
               } else {
                   currentCombined = { avatarConfig: parsed };
               }
            }
        } catch(e) {}

        if (avatarConfig) currentCombined.avatarConfig = avatarConfig;
        if (settings) currentCombined.settings = settings;

        updateData.avatar = JSON.stringify(currentCombined);
    }

    // Fetch user if password change requested
    if (currentPassword && newPassword) {
       if (existingUser) {
         const isMatch = await bcrypt.compare(currentPassword, existingUser.password);
         if (!isMatch) return res.status(400).json({ message: "Invalid current password" });
         updateData.password = await bcrypt.hash(newPassword, 10);
       }
    }

    if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', req.user.id);
        
        if (error) throw error;
    }
    
    res.json({ message: "Profile updated successfully" });

  } catch (err) {
    console.error("Profile Update Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Upload Avatar Image to Supabase Storage
router.post("/profile/avatar", authMiddleware, uploadLimiter, upload.single("avatarData"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${req.user.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Upload to Supabase Storage Bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get the Public URL of the uploaded image
    const { data: publicData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const publicUrl = publicData.publicUrl;

    // Update the User's Database Record
    // We map this specifically back into `avatarConfig: { url }` to prevent structural breaking changes for ChatUI
    const newAvatarConfig = { url: publicUrl, isCustomImage: true };

    const { error: dbUpdateError } = await supabase
      .from("users")
      .update({ avatar: JSON.stringify({ avatarConfig: newAvatarConfig }) })
      .eq("id", req.user.id);

    if (dbUpdateError) throw dbUpdateError;

    return res.json({
      message: "Avatar uploaded successfully",
      url: publicUrl,
      avatarConfig: newAvatarConfig
    });

  } catch (error) {
    console.error("Avatar Upload Error:", error);
    return res.status(500).json({ message: "Failed to upload avatar", error: error.message });
  }
});

// Delete Profile Route (Account Deletion)
router.delete("/profile", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // First delete from Supabase Auth & Users table 
    const { error: dbError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (dbError) throw dbError;

    // Delete user from Stream to prevent ghost data
    try {
      if (process.env.STREAM_API_KEY && process.env.STREAM_API_SECRET) {
        const serverClient = StreamChat.getInstance(
          process.env.STREAM_API_KEY,
          process.env.STREAM_API_SECRET
        );
        await serverClient.deleteUser(userId, { mark_messages_deleted: true });
      }
    } catch (streamError) {
      console.error("Failed to delete user from Stream:", streamError);
      // We don't throw here to ensure local deletion succeeds even if Stream errors
    }

    // Erase the cookie from the client
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("Account Deletion Error:", err);
    res.status(500).json({ message: "Server error deleting account", error: err.message });
  }
});

// ─── Forgot Password ────────────────────────────────────────────────────────
router.post("/forgot-password", authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const { data: user } = await supabase
      .from('users')
      .select('id, username, email')
      .eq('email', email)
      .single();

    // Silent success — never leak whether an account exists
    if (!user) return res.json({ message: "If that email is registered, a reset link has been sent." });

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

    // Invalidate any existing unused reset tokens for this user
    await supabase
      .from('auth_tokens')
      .update({ used: true })
      .eq('user_id', user.id)
      .eq('type', 'password_reset')
      .eq('used', false);

    await supabase.from('auth_tokens').insert([
      { token, user_id: user.id, type: 'password_reset', expires_at: expiresAt, used: false }
    ]);

    await sendPasswordResetEmail(user.username, user.email, token);

    return res.json({ message: "If that email is registered, a reset link has been sent." });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ─── Reset Password ──────────────────────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const { data: record, error } = await supabase
      .from('auth_tokens')
      .select('*')
      .eq('token', token)
      .eq('type', 'password_reset')
      .single();

    if (error || !record || record.used || new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await supabase.from('users').update({ password: hashedPassword }).eq('id', record.user_id);
    await supabase.from('auth_tokens').update({ used: true }).eq('id', record.id);

    return res.json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    console.error("Reset Password Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ─── Verify Email ─────────────────────────────────────────────────────────────
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: "Token is required" });

    const { data: record, error } = await supabase
      .from('auth_tokens')
      .select('*')
      .eq('token', token)
      .eq('type', 'email_verify')
      .single();

    if (error || !record || record.used || new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ message: "Invalid or expired verification link" });
    }

    await supabase.from('users').update({ email_verified: true }).eq('id', record.user_id);
    await supabase.from('auth_tokens').update({ used: true }).eq('id', record.id);

    return res.json({ message: "Email verified successfully! You can now log in." });
  } catch (err) {
    console.error("Verify Email Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// login routes
router.post("/login", authLimiter, async (req, res) => {
  if (!process.env.JWT_SECRET) {
    console.error("CRITICAL ERROR: JWT_SECRET is not defined in environment variables.");
    return res.status(500).json({ message: "Server configuration error" });
  }

  try {
    const { email, password } = req.body;

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (fetchError || !user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Create Token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Set token as an HttpOnly, Secure cookie
    res.cookie('token', token, {
       httpOnly: true,
       secure: process.env.NODE_ENV === 'production',
       sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Required for cross-origin requests
       maxAge: 24 * 60 * 60 * 1000 // 1 day limit
    });

      let avatarConfig = null;
      let settingsConfig = null;
      try {
        if (user.avatar) {
          const parsed = JSON.parse(user.avatar);
          if (parsed.avatarConfig || parsed.settings) {
              avatarConfig = parsed.avatarConfig || null;
              settingsConfig = parsed.settings || null;
          } else {
              avatarConfig = parsed;
          }
        }
      } catch (e) { }

      return res.json({
        message: "Login successful",
        // Token still attached temporarily for backward compatibility while UI updates
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatarConfig,
          settings: settingsConfig
        }
      });
  } catch (error) {
    console.error("Login Error Detailed:", error);
    return res.status(500).json({ 
      message: "Server error", 
      error: error.message
    });
  }
});

// Logout explicitly clear HTTP-only cookies
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  res.json({ message: "Logged out successfully" });
});

// Stream Token generator for authenticated users
router.get("/stream-token", authMiddleware, async (req, res) => {
  try {
    const apiKey = process.env.STREAM_API_KEY;
    const apiSecret = process.env.STREAM_API_SECRET;

    if (!apiKey || !apiSecret || apiKey.startsWith('REPLACE') || apiSecret.startsWith('REPLACE')) {
      console.error("[stream-token] Stream credentials are missing or still set to placeholder values.");
      console.error("  → Add STREAM_API_KEY and STREAM_API_SECRET to Backend/.env");
      console.error("  → Get them at: https://dashboard.getstream.io → your app → Overview");
      return res.status(503).json({
        message: "Stream credentials not configured on the server.",
        hint: "Add STREAM_API_KEY and STREAM_API_SECRET to your Backend/.env file."
      });
    }

    const serverClient = StreamChat.getInstance(apiKey, apiSecret);

    // Upsert the user — non-fatal: token is valid even if this fails
    try {
      await serverClient.upsertUser({ id: req.user.id, role: 'admin' });
    } catch (upsertErr) {
      console.warn("[stream-token] upsertUser failed (non-fatal):", upsertErr.message);
    }

    const token = serverClient.createToken(req.user.id);
    res.json({ token, userId: req.user.id });
  } catch (err) {
    console.error("[stream-token] Error:", err.message);
    res.status(500).json({ message: "Failed to generate stream token", detail: err.message });
  }
});

// Stream Token generator for guests
router.post("/guest-stream-token", async (req, res) => {
  try {
    const { guestId } = req.body;

    if (!guestId || !guestId.startsWith("guest_")) {
      return res.status(400).json({ message: "Invalid guest ID format." });
    }

    const apiKey = process.env.STREAM_API_KEY;
    const apiSecret = process.env.STREAM_API_SECRET;

    if (!apiKey || !apiSecret || apiKey.startsWith('REPLACE') || apiSecret.startsWith('REPLACE')) {
      console.error("[guest-stream-token] Stream credentials missing or placeholder.");
      return res.status(503).json({
        message: "Stream credentials not configured on the server.",
        hint: "Add STREAM_API_KEY and STREAM_API_SECRET to your Backend/.env file."
      });
    }

    const serverClient = StreamChat.getInstance(apiKey, apiSecret);

    // Upsert guest — non-fatal
    try {
      await serverClient.upsertUser({ id: guestId, name: 'Guest User', role: 'admin' });
    } catch (upsertErr) {
      console.warn("[guest-stream-token] upsertUser failed (non-fatal):", upsertErr.message);
    }

    const token = serverClient.createToken(guestId);
    res.json({ token, userId: guestId });
  } catch (err) {
    console.error("[guest-stream-token] Error:", err.message);
    res.status(500).json({ message: "Failed to generate guest stream token", detail: err.message });
  }
});

module.exports = router;
