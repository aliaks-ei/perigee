import { Matrix4, Quaternion, Vector3 } from 'three'
import type { SkyObjectId } from '../../../app/types/perigee'

const RAD = Math.PI / 180

/** Fixed ICRS directions; geocentric JPL Horizons 2016-01-01 00:00 UTC
 * for the Solar System, catalogue centres for stars/M31. See stellar-sky.md. */
export const targetCoordinates: Record<SkyObjectId, [number, number]> = {
  andromeda: [10.6847, 41.269], betelgeuse: [88.7929, 7.4071],
  sirius: [101.2872, -16.7161], rigel: [78.6345, -8.2016],
  moon: [176.83046, 1.54929], mars: [206.86507, -9.48133],
  jupiter: [173.99910, 3.94523], saturn: [249.59280, -20.46553], neptune: [339.32663, -9.55731],
}

export function equatorialDirection(raDegrees: number, decDegrees: number): Vector3 {
  const ra = raDegrees * RAD, dec = decDegrees * RAD
  return new Vector3(Math.cos(dec) * Math.cos(ra), Math.sin(dec), -Math.cos(dec) * Math.sin(ra))
}

/** World axes: east +X, zenith +Y, north -Z. Hour angle = LST - RA. */
export function equatorialToHorizon(ra: number, dec: number, latitude: number, siderealDegrees: number): Vector3 {
  const h = (siderealDegrees - ra) * RAD, d = dec * RAD, p = latitude * RAD
  return new Vector3(-Math.cos(d) * Math.sin(h),
    Math.sin(d) * Math.sin(p) + Math.cos(d) * Math.cos(h) * Math.cos(p),
    -(Math.sin(d) * Math.cos(p) - Math.cos(d) * Math.cos(h) * Math.sin(p)))
}

/** Orient the reference sky at the rising hour angle of the staged target.
 * Plate azimuth is authored; latitude and target altitude define a consistent
 * local horizon. Camera pans never change this celestial frame.
 */
export function referenceSkyRotation(ra: number, dec: number, target: Vector3, latitude: number): Quaternion {
  const direction = target.clone().normalize()
  const p = latitude * RAD, d = dec * RAD
  const cosHour = (direction.y - Math.sin(p) * Math.sin(d)) / (Math.cos(p) * Math.cos(d))
  const lst = ra - Math.acos(Math.max(-1, Math.min(1, cosHour))) / RAD
  const x = equatorialToHorizon(0, 0, latitude, lst)
  const y = equatorialToHorizon(0, 90, latitude, lst)
  const z = equatorialToHorizon(270, 0, latitude, lst)
  const rotation = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z))
  const actual = equatorialDirection(ra, dec).applyQuaternion(rotation)
  const yaw = Math.atan2(direction.x, direction.z) - Math.atan2(actual.x, actual.z)
  return new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw).multiply(rotation)
}
