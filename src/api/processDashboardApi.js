// src/api/processDashboardApi.js

import axios from 'axios';

const unwrapApiResponse = (response) => {
  return response?.data?.data ?? response?.data;
};

const cleanParams = (params = {}) => {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  );
};

export const getPaintDashboard = async (params = {}) => {
  const response = await axios.get('/api/process/paint', {
    params: cleanParams(params),
  });

  return unwrapApiResponse(response);
};

export const getAssemblyDashboard = async (params = {}) => {
  const response = await axios.get('/api/process/assembly', {
    params: cleanParams(params),
  });

  return unwrapApiResponse(response);
};

export const getPaintAvailableDates = async () => {
  const response = await axios.get('/api/process/paint/dates');
  return unwrapApiResponse(response);
};

export const getAssemblyAvailableDates = async () => {
  const response = await axios.get('/api/process/assembly/dates');
  return unwrapApiResponse(response);
};

const processDashboardApi = {
  getPaintDashboard,
  getAssemblyDashboard,
  getPaintAvailableDates,
  getAssemblyAvailableDates,
};

export default processDashboardApi;
