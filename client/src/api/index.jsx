import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL,
});

// Interceptor to add the auth token to every request
API.interceptors.request.use((req) => {
  const user = localStorage.getItem('user');
  if (user) {
    const token = JSON.parse(user).token;
    if (token) {
      req.headers.Authorization = `Bearer ${token}`;
    }
  }
  return req;
});

// Auth
export const registerOrLogin = (idToken) => API.post('/api/users/register', { idToken });

// User & Profile
export const getMyProfile = () => API.get('/api/users/me');
export const getUserProfile = (profileId) => API.get(`/api/users/${profileId}`);

// Friends
export const searchUsers = (query) => API.get(`/api/users/search?q=${query}`);
export const addFriend = (recipientId) => API.post('/api/users/friends/add', { recipientId });
export const getFriendRequests = () => API.get('/api/users/friends/requests');
export const respondToRequest = (requestId, response) => API.post('/api/users/friends/respond', { requestId, response });
export const getMyFriends = () => API.get('/api/users/friends/list');

// Matches
export const savePracticeMatch = (matchData) => API.post('/api/matches/practice', matchData); // <-- NEW
export const getMatchHistory = () => API.get('/api/matches/history');
export const getAIAnalysis = (stats) => API.post('/api/matches/analyze', stats);

// Leaderboard
export const getLeaderboard = () => API.get('/api/leaderboard');

export default API;