import * as THREE from 'three'
import { mixamoVRMRigMap } from './mixamoVrmRigMap'

// Retargets an already-parsed Mixamo FBX asset (the object returned by
// FBXLoader.load / loadAsync) onto a loaded VRM 0.x model, returning a
// THREE.AnimationClip whose track names point at the VRM's *normalized*
// human bone nodes (vrm.humanoid.getNormalizedBoneNode(...)).
//
// This is the same retargeting recipe used by three-vrm's own Mixamo
// examples and by the ToxSam/open-source-avatars registry's reference
// loader (integrations/animationLoader.js, CC0) — the exact source that
// serves the FBX files under opensourceavatars.com/animations/*.fbx.
// It is intentionally NOT reimplemented differently:
//  1. Find the "mixamo.com" clip inside the FBX.
//  2. Rescale hip translation by the ratio of VRM-hip-height to
//     Mixamo-hip-height so different-sized avatars don't get tiny/huge steps.
//  3. Re-express each track's rotation in the VRM bone's local space using
//     restRotationInverse/parentRestWorldRotation (this is what actually
//     "retargets" between the two different bind poses/hierarchies).
//  4. For VRM 0.x specifically, flip the sign of alternating quaternion/
//     position components — VRM 0.x models face +Z instead of VRM 1.0's -Z.
export function retargetMixamoClip(asset, vrm) {
  const clip =
    THREE.AnimationClip.findByName(asset.animations || [], 'mixamo.com') ||
    asset.animations?.[0]
  if (!clip) {
    throw new Error('No animation clip found inside the Mixamo FBX')
  }

  const hipsNode = asset.getObjectByName('mixamorigHips')
  if (!hipsNode) {
    throw new Error('No mixamorigHips bone found — this FBX does not look like a Mixamo rig')
  }

  const tracks = []
  const restRotationInverse = new THREE.Quaternion()
  const parentRestWorldRotation = new THREE.Quaternion()
  const _quatA = new THREE.Quaternion()
  const _vec3 = new THREE.Vector3()

  const motionHipsHeight = hipsNode.position.y
  const vrmHipsY = vrm.humanoid?.getNormalizedBoneNode('hips')?.getWorldPosition(_vec3).y
  const vrmRootY = vrm.scene.getWorldPosition(_vec3).y
  if (typeof vrmHipsY !== 'number' || typeof vrmRootY !== 'number') {
    throw new Error('Could not determine VRM hips position (is the humanoid rig valid?)')
  }
  const vrmHipsHeight = Math.abs(vrmHipsY - vrmRootY)
  const hipsPositionScale = vrmHipsHeight / motionHipsHeight

  clip.tracks.forEach((track) => {
    const [mixamoRigName, propertyName] = track.name.split('.')
    const vrmBoneName = mixamoVRMRigMap[mixamoRigName]
    const vrmNode = vrmBoneName ? vrm.humanoid?.getNormalizedBoneNode(vrmBoneName) : null
    const vrmNodeName = vrmNode?.name
    const mixamoRigNode = asset.getObjectByName(mixamoRigName)

    if (!vrmNodeName || !mixamoRigNode) return

    mixamoRigNode.getWorldQuaternion(restRotationInverse).invert()
    mixamoRigNode.parent.getWorldQuaternion(parentRestWorldRotation)

    if (track instanceof THREE.QuaternionKeyframeTrack) {
      for (let i = 0; i < track.values.length; i += 4) {
        const flatQuaternion = track.values.slice(i, i + 4)
        _quatA.fromArray(flatQuaternion)
        _quatA.premultiply(parentRestWorldRotation).multiply(restRotationInverse)
        _quatA.toArray(flatQuaternion)
        flatQuaternion.forEach((v, index) => {
          track.values[index + i] = v
        })
      }
      tracks.push(
        new THREE.QuaternionKeyframeTrack(
          `${vrmNodeName}.${propertyName}`,
          track.times,
          track.values.map((v, i) => (vrm.meta?.metaVersion === '0' && i % 2 === 0 ? -v : v))
        )
      )
    } else if (track instanceof THREE.VectorKeyframeTrack) {
      const value = track.values.map(
        (v, i) => (vrm.meta?.metaVersion === '0' && i % 3 !== 1 ? -v : v) * hipsPositionScale
      )
      tracks.push(new THREE.VectorKeyframeTrack(`${vrmNodeName}.${propertyName}`, track.times, value))
    }
  })

  return new THREE.AnimationClip('vrmAnimation', clip.duration, tracks)
}
