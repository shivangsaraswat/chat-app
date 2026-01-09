// ============================================
// User & Profile Types
// ============================================

export type UserStatus = 'active' | 'deactivated' | 'deleted';
export type ThemePreference = 'light' | 'dark' | 'system';

export interface User {
    id: string;
    email: string;
    phone?: string | null;
    status: UserStatus;
    isAdmin: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;
}

export interface Username {
    id: string;
    userId: string;
    username: string;
    createdAt: Date;
}

export interface Profile {
    id: string;
    userId: string;
    displayName: string;
    bio?: string | null;
    photoUrl?: string | null;
    theme: ThemePreference;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserWithProfile extends User {
    username: Username;
    profile: Profile;
}

// ============================================
// Follow / Connection Types
// ============================================

export type FollowStatus = 'pending' | 'accepted' | 'rejected';

export interface Follow {
    id: string;
    followerId: string;
    followingId: string;
    status: FollowStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface FollowWithUser extends Follow {
    follower: UserWithProfile;
    following: UserWithProfile;
}

// ============================================
// Block Types
// ============================================

export interface Block {
    id: string;
    blockerId: string;
    blockedId: string;
    createdAt: Date;
}

// ============================================
// Conversation Types
// ============================================

export interface Conversation {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;
}

export interface ConversationParticipant {
    id: string;
    conversationId: string;
    userId: string;
    joinedAt: Date;
    leftAt?: Date | null;
}

export interface ConversationWithParticipants extends Conversation {
    participants: (ConversationParticipant & { user: UserWithProfile })[];
    lastMessage?: Message | null;
}

// ============================================
// Message Types
// ============================================

export type MessageType = 'text' | 'image' | 'file' | 'sticker' | 'view_once';

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    type: MessageType;
    content?: string | null;
    isViewOnce: boolean;
    isDisappearing: boolean;
    expiresAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;
}

export interface MessageMedia {
    id: string;
    messageId: string;
    url: string;
    mimeType: string;
    size: number;
    width?: number | null;
    height?: number | null;
    createdAt: Date;
}

export interface MessageWithMedia extends Message {
    media?: MessageMedia[];
    sender: UserWithProfile;
}

// ============================================
// Admin Types
// ============================================

export type AdminActionType =
    | 'view_user'
    | 'restrict_user'
    | 'unrestrict_user'
    | 'disable_messaging'
    | 'enable_messaging'
    | 'view_conversation'
    | 'delete_conversation';

export interface AdminLog {
    id: string;
    adminId: string;
    actionType: AdminActionType;
    targetType: 'user' | 'conversation' | 'message';
    targetId: string;
    metadata?: Record<string, unknown> | null;
    createdAt: Date;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    nextCursor?: string | null;
    hasMore: boolean;
}

// ============================================
// Socket Event Types
// ============================================

export interface SocketMessage {
    conversationId: string;
    message: MessageWithMedia;
}

export interface SocketTyping {
    conversationId: string;
    userId: string;
    isTyping: boolean;
}

export interface SocketOnline {
    userId: string;
    isOnline: boolean;
    lastSeen?: Date;
}

export interface SocketMessageRead {
    conversationId: string;
    messageId: string;
    userId: string;
}

// ============================================
// Auth Types
// ============================================

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface JwtPayload {
    userId: string;
    email: string;
    isAdmin: boolean;
    iat: number;
    exp: number;
}

export interface OtpRequest {
    email: string;
}

export interface OtpVerify {
    email: string;
    otp: string;
}

// ============================================
// Onboarding Types
// ============================================

export type OnboardingStep =
    | 'email'
    | 'otp'
    | 'username'
    | 'profile'
    | 'theme'
    | 'complete';

export interface OnboardingState {
    currentStep: OnboardingStep;
    email?: string;
    username?: string;
    displayName?: string;
    bio?: string;
    photoUrl?: string;
    theme?: ThemePreference;
}
