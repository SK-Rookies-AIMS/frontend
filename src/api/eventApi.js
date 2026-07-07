import axiosInstance from './axiosInstance';

export const eventApi = {
  getOverallEvents: async (page = 0, size = 10, filters = {}) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(size),
        ...filters,
      }).toString();
      const response = await axiosInstance.get(`/api/event?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  },
  getEventByLogNo: async (logNo) => {
    try {
      const response = await axiosInstance.get(`/api/event/${logNo}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching event by logNo:', error);
      throw error;
    }
  },
  getEventByEventId: async (eventId) => {
    try {
      const response = await axiosInstance.get(`/api/event/by-event-id/${eventId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching event by eventId:', error);
      throw error;
    }
  },
  updateEventAction: async (logNo, actionStatus, actionBy = null, reason = null) => {
    try {
      const response = await axiosInstance.patch(`/api/event/${logNo}/action`, {
        actionStatus,
        actionBy,
        reason,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating event action:', error);
      throw error;
    }
  },
};
