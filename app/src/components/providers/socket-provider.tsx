'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth-provider';
import type { MessageWithMedia, SocketTyping, SocketOnline, SocketMessageRead } from '@chat-app/types';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    joinRoom: (conversationId: string) => void;
    leaveRoom: (conversationId: string) => void;
    sendTypingStart: (conversationId: string) => void;
    sendTypingStop: (conversationId: string) => void;
    sendMessageRead: (conversationId: string, messageId: string) => void;
    onNewMessage: (callback: (data: { conversationId: string; message: MessageWithMedia }) => void) => () => void;
    onTyping: (callback: (data: SocketTyping) => void) => () => void;
    onUserStatus: (callback: (data: SocketOnline) => void) => () => void;
    onMessageRead: (callback: (data: SocketMessageRead) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function SocketProvider({ children }: { children: ReactNode }) {
    const { tokens, isAuthenticated } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!isAuthenticated || !tokens?.accessToken) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setSocket(null);
                setIsConnected(false);
            }
            return;
        }

        const newSocket = io(API_URL, {
            auth: { token: tokens.accessToken },
            transports: ['websocket', 'polling'],
        });

        socketRef.current = newSocket;
        setSocket(newSocket);

        newSocket.on('connect', () => {
            setIsConnected(true);
            console.log('🔌 Socket connected');
        });

        newSocket.on('disconnect', () => {
            setIsConnected(false);
            console.log('🔌 Socket disconnected');
        });

        newSocket.on('connect_error', (error) => {
            // Only log in development, and gracefully handle auth errors
            if (process.env.NODE_ENV === 'development') {
                console.log('🔌 Socket connection error (will retry):', error.message);
            }
            setIsConnected(false);
        });

        return () => {
            newSocket.disconnect();
            socketRef.current = null;
            setSocket(null);
            setIsConnected(false);
        };
    }, [isAuthenticated, tokens?.accessToken]);

    const joinRoom = useCallback((conversationId: string) => {
        socket?.emit('room:join', conversationId);
    }, [socket]);

    const leaveRoom = useCallback((conversationId: string) => {
        socket?.emit('room:leave', conversationId);
    }, [socket]);

    const sendTypingStart = useCallback((conversationId: string) => {
        socket?.emit('typing:start', { conversationId });
    }, [socket]);

    const sendTypingStop = useCallback((conversationId: string) => {
        socket?.emit('typing:stop', { conversationId });
    }, [socket]);

    const sendMessageRead = useCallback((conversationId: string, messageId: string) => {
        socket?.emit('message:read', { conversationId, messageId });
    }, [socket]);

    const onNewMessage = useCallback((callback: (data: { conversationId: string; message: MessageWithMedia }) => void) => {
        socket?.on('message:new', callback);
        return () => {
            socket?.off('message:new', callback);
        };
    }, [socket]);

    const onTyping = useCallback((callback: (data: SocketTyping) => void) => {
        const handleTypingStart = (data: SocketTyping) => callback({ ...data, isTyping: true });
        const handleTypingStop = (data: SocketTyping) => callback({ ...data, isTyping: false });

        socket?.on('typing:start', handleTypingStart);
        socket?.on('typing:stop', handleTypingStop);

        return () => {
            socket?.off('typing:start', handleTypingStart);
            socket?.off('typing:stop', handleTypingStop);
        };
    }, [socket]);

    const onUserStatus = useCallback((callback: (data: SocketOnline) => void) => {
        socket?.on('user:online', callback);
        socket?.on('user:offline', callback);
        return () => {
            socket?.off('user:online', callback);
            socket?.off('user:offline', callback);
        };
    }, [socket]);

    const onMessageRead = useCallback((callback: (data: SocketMessageRead) => void) => {
        socket?.on('message:read', callback);
        return () => {
            socket?.off('message:read', callback);
        };
    }, [socket]);

    return (
        <SocketContext.Provider
            value={{
                socket,
                isConnected,
                joinRoom,
                leaveRoom,
                sendTypingStart,
                sendTypingStop,
                sendMessageRead,
                onNewMessage,
                onTyping,
                onUserStatus,
                onMessageRead,
            }}
        >
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
}
