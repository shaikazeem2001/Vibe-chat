const { algoliasearch } = require('algoliasearch');

// Initialise once — reused across the entire process
const algolia = algoliasearch(
  process.env.ALGOLIA_APPID,
  process.env.ALGOLIA_WRITEKEY // admin key for write operations
);

const INDEX = 'messages';

/**
 * Push a new message record to Algolia.
 * Call this after every successful DB insert.
 *
 * @param {object} msg - { id, text, sender_id, room_id, created_at }
 * @param {string} senderName - Resolved display name for the sender
 * @param {string} roomName   - Human-readable room name (or room_id if unknown)
 */
async function indexMessage(msg, senderName, roomName) {
  try {
    await algolia.saveObject({
      indexName: INDEX,
      body: {
        objectID: msg.id,
        content: msg.text,
        sender: senderName || msg.sender_id,
        roomId: msg.room_id,
        roomName: roomName || msg.room_id,
        timestamp: msg.created_at,
        _tags: [`room:${msg.room_id}`],
      },
    });
  } catch (err) {
    // Non-fatal — don't break the message send flow
    console.error('[Algolia] indexMessage failed:', err.message);
  }
}

/**
 * Remove a message record from Algolia when the message is deleted.
 * @param {string} messageId - The message UUID
 */
async function deleteMessageIndex(messageId) {
  try {
    await algolia.deleteObject({ indexName: INDEX, objectID: messageId });
  } catch (err) {
    console.error('[Algolia] deleteMessageIndex failed:', err.message);
  }
}

/**
 * Proxy search — called from the search API route.
 * Restricts results to a single room via tagFilters.
 *
 * @param {string} query   - The search string
 * @param {string} roomId  - UUID of the room to scope results to
 * @param {number} [limit] - Max hits (default 8)
 */
async function searchMessages(query, roomId, limit = 8) {
  const { results } = await algolia.search({
    requests: [{
      indexName: INDEX,
      query,
      tagFilters: [`room:${roomId}`],
      attributesToHighlight: ['content'],
      hitsPerPage: limit,
    }],
  });
  return results[0]?.hits || [];
}

module.exports = { algolia, indexMessage, deleteMessageIndex, searchMessages };
