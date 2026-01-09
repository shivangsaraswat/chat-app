-- Database Cleanup Script
-- Delete all data in correct order to respect foreign key constraints

-- Delete all OTPs
DELETE FROM "Otp";

-- Delete all refresh tokens
DELETE FROM "RefreshToken";

-- Delete all message media
DELETE FROM "MessageMedia";

-- Delete all messages
DELETE FROM "Message";

-- Delete all conversation participants
DELETE FROM "ConversationParticipant";

-- Delete all conversations
DELETE FROM "Conversation";

-- Delete all follows
DELETE FROM "Follow";

-- Delete all blocks
DELETE FROM "Block";

-- Delete all admin logs
DELETE FROM "AdminLog";

-- Delete all profiles
DELETE FROM "Profile";

-- Delete all usernames
DELETE FROM "Username";

-- Delete all users
DELETE FROM "User";
