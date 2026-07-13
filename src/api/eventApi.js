import axiosInstance from './axiosInstance';

export const eventApi = {
  getOverallEvents: async (page = 0, size = 10, filters = {}) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(size),
        ...filters,
      }).toString();
      const response = await axiosInstance.get(`/event?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  },getEventsBySeverity: async (severity, page = 0, size = 5) => {
    try {
      const response = await axiosInstance.get(`/event?severity=${severity}&page=${page}&size=${size}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching events by severity (${severity}):`, error);
      throw error;
    }
  },
  getEventByLogNo: async (logNo) => {
    try {
      const response = await axiosInstance.get(`/event/${logNo}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching event by logNo:', error);
      throw error;
    }
  },
  getEventByEventId: async (eventId) => {
    try {
      const response = await axiosInstance.get(`/event/by-event-id/${eventId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching event by eventId:', error);
      throw error;
    }
  },
  /**
   * @param {number} [days=7]
   * @returns {Promise<import('../types/event').EventPrioritySummaryResponse>}
   */
  getEventPrioritySummary: async (days = 7) => {
    try {
      const response = await axiosInstance.get('/event/priority-summary', {
        params: { days },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching event priority summary:', error);
      throw error;
    }
  },
  /**
   * @param {string} logNo
   * @param {string} actionStatus
   * @param {string | null} [actionBy]
   * @param {string | null} [reason]
   */
  updateEventAction: async (logNo, actionStatus, actionBy = null, reason = null) => {
    try {
      const response = await axiosInstance.patch(`/event/${logNo}/action`, {
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
