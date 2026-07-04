import axiosInstance from './axiosInstance';

export const eventApi = {
  getOverallEvents: async (page = 0, size = 10) => {
    try {
      const response = await axiosInstance.get(`/api/event/get_overall_events?page=${page}&size=${size}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching overall events:', error);
      throw error;
    }
  },
  updateEvent: async (logNo, actionStatus, actionBy = null, reason = null) => {
    try {
      const response = await axiosInstance.post('/api/event/update_event', {
        logNo,
        actionStatus,
        actionBy,
        reason,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  },
};
