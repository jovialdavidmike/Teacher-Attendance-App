export function verifyLocation(
  teacherLat: number,
  teacherLng: number,
  adminLat: number,
  adminLng: number,
  allowedRadiusInMeters: number
): boolean {
  const toRad = (value: number) => (value * Math.PI) / 180;
  
  const R = 6371e3; // Earth radius in meters
  const dLat = toRad(adminLat - teacherLat);
  const dLon = toRad(adminLng - teacherLng);
  const lat1 = toRad(teacherLat);
  const lat2 = toRad(adminLat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance <= allowedRadiusInMeters;
}
