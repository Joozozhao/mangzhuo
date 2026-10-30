import Spheres2Background from './spheres.js'

const bg = Spheres2Background(document.getElementById('webgl-canvas'), {
    count: 200,
    colors: [0xff0000, 0x0, 0xffffff],
    minSize: 0.5,
    maxSize: 1
})

const button1 = document.getElementById('colors-btn')

document.body.addEventListener('click', (ev) => {
    if (ev.target !== button1) bg.togglePause()
})

button1.addEventListener('click', () => {
    bg.spheres.setColors([0xffffff * Math.random(), 0xffffff * Math.random(), 0xffffff * Math.random()])
    bg.spheres.light1.color.set(0xffffff * Math.random())
})
