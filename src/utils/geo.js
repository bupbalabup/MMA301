import { createId } from './id';
import { normalizeLocationTimestamp } from './timestamp';

const EARTH_RADIUS_KM = 6371;
const MS_PER_HOUR = 3600000;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function getCoords(point) {
  if (point?.coords) {
    return point.coords;
  }

  return point;
}

function isValidCoordinate(latitude, longitude) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function calculateDistanceKm(pointA, pointB) {
  const coordsA = getCoords(pointA);
  const coordsB = getCoords(pointB);

  if (!coordsA || !coordsB) {
    return 0;
  }

  const { latitude: latA, longitude: lonA } = coordsA;
  const { latitude: latB, longitude: lonB } = coordsB;

  if (!isValidCoordinate(latA, lonA) || !isValidCoordinate(latB, lonB)) {
    return 0;
  }

  const deltaLat = toRadians(latB - latA);
  const deltaLon = toRadians(lonB - lonA);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(latA)) *
      Math.cos(toRadians(latB)) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function calculateSpeedKmh(previousPoint, currentPoint) {
  if (!previousPoint || !currentPoint) {
    return 0;
  }

  const distanceKm = calculateDistanceKm(previousPoint, currentPoint);
  const elapsedTimeMs = currentPoint.timestamp - previousPoint.timestamp;

  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    return 0;
  }

  if (!Number.isFinite(elapsedTimeMs) || elapsedTimeMs <= 0) {
    return 0;
  }

  const speedKmh = distanceKm / (elapsedTimeMs / MS_PER_HOUR);

  if (!Number.isFinite(speedKmh) || speedKmh < 0) {
    return 0;
  }

  return speedKmh;
}

export function calculateTotalDistanceKm(points) {
  if (!Array.isArray(points) || points.length < 2) {
    return 0;
  }

  let totalDistanceKm = 0;

  for (let index = 1; index < points.length; index += 1) {
    totalDistanceKm += calculateDistanceKm(points[index - 1], points[index]);
  }

  return totalDistanceKm;
}

export function calculateAverageSpeedKmh(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return 0;
  }

  const storedSpeeds = points
    .map((point) => point.speedKmh)
    .filter((speedKmh) => Number.isFinite(speedKmh) && speedKmh >= 0);

  if (storedSpeeds.length > 0) {
    const totalSpeedKmh = storedSpeeds.reduce(
      (total, speedKmh) => total + speedKmh,
      0
    );

    return totalSpeedKmh / storedSpeeds.length;
  }

  if (points.length < 2) {
    return 0;
  }

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const durationHours = (lastPoint.timestamp - firstPoint.timestamp) / 3600000;

  if (durationHours <= 0) {
    return 0;
  }

  return calculateTotalDistanceKm(points) / durationHours;
}

export function calculateMaxSpeedKmh(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return 0;
  }

  return points.reduce((maxSpeed, point) => {
    const speedKmh = Number.isFinite(point.speedKmh) ? point.speedKmh : 0;
    return Math.max(maxSpeed, speedKmh);
  }, 0);
}

export function interpolateGpsPosition(pointA, pointB, targetTimestamp) {
  if (!pointA && !pointB) {
    return null;
  }

  if (!pointA) {
    return pointB;
  }

  if (!pointB) {
    return pointA;
  }

  const startTimestamp = pointA.timestamp;
  const endTimestamp = pointB.timestamp;

  if (
    !Number.isFinite(startTimestamp) ||
    !Number.isFinite(endTimestamp) ||
    endTimestamp <= startTimestamp
  ) {
    return targetTimestamp >= endTimestamp ? pointB : pointA;
  }

  const rawRatio = (targetTimestamp - startTimestamp) / (endTimestamp - startTimestamp);
  const ratio = Math.min(1, Math.max(0, rawRatio));
  const speedA = Number.isFinite(pointA.speedKmh) ? pointA.speedKmh : 0;
  const speedB = Number.isFinite(pointB.speedKmh) ? pointB.speedKmh : speedA;

  return {
    ...pointA,
    latitude: pointA.latitude + (pointB.latitude - pointA.latitude) * ratio,
    longitude: pointA.longitude + (pointB.longitude - pointA.longitude) * ratio,
    speedKmh: speedA + (speedB - speedA) * ratio,
    timestamp: targetTimestamp,
  };
}

export function normalizeLocationToPoint(location) {
  const coords = getCoords(location) ?? {};
  const timestamp = normalizeLocationTimestamp(location?.timestamp);

  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    speedKmh: Number.isFinite(location?.speedKmh) ? location.speedKmh : 0,
    heading: coords.heading ?? location?.heading ?? null,
    accuracy: coords.accuracy ?? location?.accuracy ?? null,
    altitude: coords.altitude ?? location?.altitude ?? null,
    timestamp,
    createdAt: Date.now(),
  };
}

export function normalizeLocationToGpsPoint(
  location,
  tripId,
  previousPoint = null
) {
  const point = normalizeLocationToPoint(location);
  const speedKmh = Number.isFinite(location?.speedKmh)
    ? location.speedKmh
    : calculateSpeedKmh(previousPoint, point);

  return {
    id: createId('point'),
    tripId,
    ...point,
    speedKmh,
  };
}
