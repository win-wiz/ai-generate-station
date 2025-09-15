import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UserProfile = ({ userId }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/users/${userId}`);
        setUser(response.data);
      } catch (err) {
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const handleUpdateProfile = async (updatedData) => {
    try {
      const response = await axios.put(`/api/users/${userId}`, updatedData);
      setUser(response.data);
    } catch (err) {
      setError('Failed to update profile');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!user) return <div className="no-user">User not found</div>;

  return (
    <div className="user-profile">
      <div className="profile-header">
        <img src={user.avatar} alt={user.name} className="avatar" />
        <h1>{user.name}</h1>
        <p className="email">{user.email}</p>
      </div>
      
      <div className="profile-details">
        <div className="detail-item">
          <label>Bio:</label>
          <p>{user.bio || 'No bio available'}</p>
        </div>
        
        <div className="detail-item">
          <label>Location:</label>
          <p>{user.location || 'Not specified'}</p>
        </div>
        
        <div className="detail-item">
          <label>Joined:</label>
          <p>{new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
      
      <button 
        onClick={() => handleUpdateProfile({ ...user, lastActive: new Date() })}
        className="update-btn"
      >
        Update Last Active
      </button>
    </div>
  );
};

export default UserProfile;