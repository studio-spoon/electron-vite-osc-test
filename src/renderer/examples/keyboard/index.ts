import * as Tone from 'tone'
import { Coord, sensor } from '@scripts/sensor'

const synth = new Tone.Synth().toDestination()

const noteMap = new WeakMap<HTMLElement, string>()
const whiteKeys: HTMLElement[] = []
const blackKeys: HTMLElement[] = []

const keyboard = document.querySelector<HTMLElement>('.keyboard')!

for (const octaveEl of keyboard.querySelectorAll<HTMLElement>('.octave')) {
  const octave = octaveEl.dataset.octave!

  for (const key of octaveEl.querySelectorAll<HTMLElement>('& > span')) {
    const note = key.dataset.note!
    const n = note + octave
    key.style.setProperty('--note', `"${n}"`)
    whiteKeys.push(key)
    noteMap.set(key, n)

    const sharp = key.querySelector<HTMLElement>('.sharp')
    if (sharp) {
      blackKeys.push(sharp)
      noteMap.set(sharp, note + '#' + octave)
    }
  }
}

function inRect(el: HTMLElement, coord: Coord) {
  const rect = el.getBoundingClientRect()
  const cx = ((rect.x + rect.width * 0.5) / window.innerWidth) * 2.0 - 1.0
  const cy = (1.0 - (rect.y + rect.height * 0.5) / window.innerHeight) * 2.0 - 1.0
  const width = (rect.width / window.innerWidth) * 2
  const height = (rect.height / window.innerHeight) * 2
  const top_left = [cx - width / 2, cy + height / 2]
  const bottom_right = [cx + width / 2, cy - height / 2]

  return top_left[0] < coord[0] && coord[0] < bottom_right[0] && bottom_right[1] < coord[1] && coord[1] < top_left[1]
}

const debounceTime = 500; // デバウンス時間（ミリ秒）
const lastPressed: WeakMap<HTMLElement, number> = new WeakMap()

function touch(key: HTMLElement, coord: Coord) {
  const now = Date.now()
  const lastTime = lastPressed.get(key) || 0

  const isHit = inRect(key, coord)
  if (isHit && !key.classList.contains('active')) {
    if (now - lastTime >= debounceTime) {
      // 音を鳴らす
      synth.triggerAttackRelease(noteMap.get(key)!, '32n')
      lastPressed.set(key, now)
    }
  }
  return isHit ? key : null
}

function cssTouch(key: HTMLElement, coord: Coord) {
  const isHit = inRect(key, coord)
  if (isHit && !key.classList.contains('active')) {
    key.classList.add('active')
  }
  return isHit ? key : null
}

function anime() {
  if (sensor.coords) {
    let hits: HTMLElement[] = []

    for (const coord of sensor.coords) {
      // 検出点が鍵盤上にあるかどうか
      if (!inRect(keyboard, coord)) continue

      // あれば、黒鍵から当たり判定を調べていく
      let hit: HTMLElement | null = null
      // 黒鍵
      for (const key of blackKeys) {
        hit = touch(key, coord)
        cssTouch(key, coord)
        if (hit) break
      }
      // 白鍵
      if (!hit) {
        for (const key of whiteKeys) {
          hit = touch(key, coord)
          cssTouch(key, coord)
          if (hit) break
        }
      }
      if (hit) hits.push(hit)
    }

    // 現在のヒット状態を反映
    for (const key of keyboard.querySelectorAll('.active')) {
      if (!hits.includes(key)) key.classList.remove('active')
    }
  }
  requestAnimationFrame(anime)
}

anime()