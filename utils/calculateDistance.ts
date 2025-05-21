type Coord = {
  latitude: number;
  longitude: number;
};

export const calculateDistance = (coord1:Coord, coord2:Coord) => {
    const toRad = (val:number) => (val * Math.PI) / 180;
  
    const R = 3958.8; // Radius of Earth in miles
    const dLat = toRad(coord2.latitude - coord1.latitude);
    const dLon = toRad(coord2.longitude - coord1.longitude);
    const lat1 = toRad(coord1.latitude);
    const lat2 = toRad(coord2.latitude);
  
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLon / 2) ** 4;
  
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  