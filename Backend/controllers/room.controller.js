const supabase = require("../config/supabase");
const crypto = require("crypto");

exports.getRooms = async (req, res) => {
  try {
    // Use explicit FK hint to resolve the PGRST201 ambiguity:
    // rooms has TWO relationships to users (created_by FK + room_members junction)
    // We want the creator's username via the direct FK, not the many-to-many.
    const { data: rooms, error } = await supabase
      .from('rooms')
      .select('*, users!rooms_created_by_fkey(username)');

    if (error) throw error;

    // Transform to match frontend expectation (populated createdBy)
    const transformedRooms = rooms.map(room => ({
      ...room,
      createdBy: room.users ? { username: room.users.username } : null
    }));

    res.json(transformedRooms);
  } catch (err) {
    console.error("Fetch rooms error:", err);
    res.status(500).json({ message: "Failed to fetch rooms" });
  }
};

exports.createRoom = async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;
    
    let inviteCode = null;
    if (isPrivate) {
      inviteCode = crypto.randomBytes(3).toString("hex");
    }

    const { data: room, error } = await supabase
      .from('rooms')
      .insert([
        {
          name,
          description,
          is_private: !!isPrivate,
          invite_code: inviteCode,
          created_by: req.user.id
        }
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Postgres secondary unique constraint violation
        return res.status(400).json({ message: "Room name or invite code already exists" });
      }
      throw error;
    }

    // Add creator to members
    await supabase
      .from('room_members')
      .insert([{ room_id: room.id, user_id: req.user.id }]);

    res.status(201).json(room);
  } catch (err) {
    console.error("Create room error:", err);
    res.status(400).json({ message: "Failed to create room" });
  }
};

exports.getRoomByName = async (req, res) => {
  try {
    const { name } = req.params;
    const { data: room, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('name', name)
      .single();

    if (error || !room) return res.status(404).json({ message: "Room not found" });
    
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.joinByInviteCode = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    
    const { data: room, error: fetchError } = await supabase
      .from('rooms')
      .select('*')
      .eq('invite_code', inviteCode)
      .single();

    if (fetchError || !room) return res.status(404).json({ message: "Invalid invite code" });

    // Check if already a member
    const { data: member, error: memberError } = await supabase
      .from('room_members')
      .select('*')
      .eq('room_id', room.id)
      .eq('user_id', req.user.id)
      .single();

    if (member) {
      return res.status(200).json({ message: "Already a member", room });
    }

    await supabase
      .from('room_members')
      .insert([{ room_id: room.id, user_id: req.user.id }]);

    res.json({ message: "Joined successfully", room });
  } catch (err) {
    console.error("Join room error:", err);
    res.status(500).json({ message: "Failed to join room" });
  }
};
