import axiosInstance from './axiosInstance';

/**
 * Event API wrapper matching the new backend endpoints.
 * All methods return the `data` field of the `ApiResponse`.
 */
export const eventApi = {
  /**
   * Fetch paginated events with optional filters.
   * The backend expects zero‑based page index.
   */
  getOverallEvents: async (page = 0, size = 10, filters = {}) => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(size),
        ...filters,
      }).toString();
      const response = await axiosInstance.get(`/api/event?${params}`);
      return response.data; // { status, data: Page<AlertEventResponse> }
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  },

  /**
   * Retrieve a single event by its log number.
   */
  getEventByLogNo: async (logNo) => {
    try {
      const response = await axiosInstance.get(`/api/event/${logNo}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching event by logNo:', error);
      throw error;
    }
  },

  /**
   * Retrieve a single event by external eventId.
   */
  getEventByEventId: async (eventId) => {
    try {
      const response = await axiosInstance.get(`/api/event/by-event-id/${eventId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching event by eventId:', error);
      throw error;
    }
  },

  /**
   * Update the action status of an event.
   * PATCH /api/event/{logNo}/action with JSON body.
   */
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
