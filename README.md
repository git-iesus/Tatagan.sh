# Tatagan.sh — Hevy Workout Tracker Mobile Web Clone (PWA)

Clone web mobile-first do aplicativo **Hevy - Gym Log Workout Tracker (`com.hevy` v1.8.1)** reconstruído via engenharia reversa com o **REA (Reverse Engineer Anything)** a partir do APK [`hevy_aplicativo_.apk`](../hevy_aplicativo_.apk).

---

## 🚀 Como Executar

```bash
cd "Tatagan.sh"
npm install
npm run dev
```

Para gerar o bundle de produção otimizado:
```bash
npm run build
npm run preview
```

---

## 📦 Dados e Assets Oficiais Extraídos do APK (`hevy_aplicativo_.apk`)

1. **Catálogo Oficial Completo (`src/data/exercises.json`)**:
   - **434 exercícios oficiais** extraídos diretamente do *Object Value Buffer* (`SerializedLiteralParser`) do Hermes Bytecode v96 (`assets/index.android.bundle`).
   - Inclui títulos em Português (`pt-BR`) e Inglês (`en`), grupo muscular primário, equipamento, **432 vídeos demonstrativos MP4 oficiais (CloudFront CDN)**, **432 miniaturas `@3x.jpg`** e **instruções passo a passo em Português**.
2. **Mapa Anatômico Muscular de 72 Camadas (`public/assets/muscles/`)**:
   - Todas as 72 camadas PNG anatômicas (`malebodyfront.png`, `malebodyback.png`, `femalebodyfront.png`, `femalebodyback.png` + 17 grupamentos musculares frente/costas masculino e feminino).
3. **Efeitos Sonoros Oficiais (`public/sounds/`)**:
   - `boxing_bell.wav`, `ting_ting.wav`, `futuristic.wav`, `original.wav`, `alarm.wav`, `livepr_high.wav`, `livepr_normal.wav`, `set_complete_high.wav`, `set_complete_medium.wav`, `set_complete_low.wav`.
4. **Insígnias de Comparação de Volume (`public/assets/volume/`)**:
   - As 13 ilustrações oficiais (`motorcycle.png`, `shark.png`, `car.png`, `pickuptruck.png`, `van.png`, `helicopter.png`, `elephant.png`, `trex.png`, `truck.png`, `bus.png`, `yacht.png`, `jet.png`, `airplane.png`).
5. **Tipografia Oficial (`public/fonts/`)**:
   - Família `Figtree` (`Regular`, `Medium`, `SemiBold`, `Bold`) extraída de `assets/fonts/`.
