import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { registerOrLogin } from '../api';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendUser, setBackendUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const idToken = await user.getIdToken();
        // Store user and token for API calls and session persistence
        localStorage.setItem('user', JSON.stringify({ email: user.email, token: idToken }));
        setCurrentUser(user);
        
        // Register or log in the user with our backend
        try {
          const response = await registerOrLogin(idToken);
          setBackendUser(response.data.user);
        } catch (error) {
          console.error("Backend authentication failed", error);
        }
      } else {
        localStorage.removeItem('user');
        setCurrentUser(null);
        setBackendUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    backendUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};