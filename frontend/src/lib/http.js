import axios from 'axios';

const http = axios.create({
  baseURL: 'http://localhost:8000/api/',
  withCredentials: false,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  timeout: 15000,
});

console.log('✅ axios baseURL:', http.defaults.baseURL);

export default http;
