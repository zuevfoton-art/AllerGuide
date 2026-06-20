module.exports = {
  requestForegroundPermissionsAsync: async () => ({ status: 'denied' }),
  getCurrentPositionAsync: async () => ({ coords: { latitude: 0, longitude: 0 } }),
};
