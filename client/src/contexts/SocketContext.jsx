import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { currentUser } = useAuth();

    useEffect(() => {
        if (currentUser) {
            const newSocket = io(import.meta.env.VITE_SERVER_URL);
            
            newSocket.on('connect', () => {
                // Authenticate the socket connection with the backend
                newSocket.emit('authenticate', currentUser.uid);
            });

            setSocket(newSocket);

            return () => newSocket.close();
        } else {
            if (socket) {
                socket.close();
                setSocket(null);
            }
        }
    }, [currentUser]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};