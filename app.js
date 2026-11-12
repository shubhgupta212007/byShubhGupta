(() => {
  'use strict';

  const PLANCK = 6.62607015e-34;
  const ELECTRON_MASS = 9.1093837139e-31;
  const ELEMENTARY_CHARGE = 1.602176634e-19;
  const MAX_N = 5;
  const NS = 'http://www.w3.org/2000/svg';

  const stateInput = document.querySelector('#state-range');
  const widthInput = document.querySelector('#width-range');
  const waveCanvas = document.querySelector('#wave-chart');
  const densityCanvas = document.querySelector('#density-chart');
  const stateOutput = document.querySelector('#state-output');
  const widthOutput = document.querySelector('#width-output');
  const energyValue = document.querySelector('#energy-value');
  const energyLevel = document.querySelector('#energy-level');
  const energyE1 = document.querySelector('#energy-e1');
  const ladder = document.querySelector('#energy-ladder');
  const boxWidthCaption = document.querySelector('#box-width-caption');
  const densityAxisEnd = document.querySelector('#density-axis-end');
  const measurementMark = document.querySelector('#measurement-mark');
  const measurementLine = document.querySelector('#measurement-line');
  const measurementDot = document.querySelector('#measurement-dot');
  const measurementLabel = document.querySelector('#measurement-label');
  const measureButton = document.querySelector('#measure-button');
  const measureFeedback = document.querySelector('#measure-feedback');
  const ladderSelectedLabel = document.querySelector('#ladder-selected-label');

  let measuredFraction = null;
  let n = Number(stateInput.value);
  let widthNm = Number(widthInput.value);
  let resizeObserver;

  function energyFor(nValue, widthInNm) {
    const widthMetres = widthInNm * 1e-9;
    return ((nValue * nValue * PLANCK * PLANCK) / (8 * ELECTRON_MASS * widthMetres * widthMetres)) / ELEMENTARY_CHARGE;
  }

  function setRangeProgress(input) {
    const min = Number(input.min);
    const max = Number(input.max);
    const value = Number(input.value);
    const progress = ((value - min) / (max - min)) * 100;
    input.style.setProperty('--range-progress', `${progress}%`);
  }

  function svgElement(name, attributes = {}, text = '') {
    const element = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    if (text) element.textContent = text;
    return element;
  }

  function buildLadder() {
    ladder.replaceChildren();

    for (let index = MAX_N; index >= 1; index -= 1) {
      const scaledRatio = (index * index) / (MAX_N * MAX_N);
      const row = document.createElement('div');
      row.className = `ladder-row${index === n ? ' selected' : ''}`;
      row.setAttribute('aria-label', `State n equals ${index}, energy ${index * index} times E1${index === n ? ', selected' : ''}`);
      row.setAttribute('aria-current', index === n ? 'true' : 'false');

      const label = document.createElement('span');
      label.className = 'ladder-n';
      label.textContent = `n${index}`;
      const track = document.createElement('span');
      track.className = 'ladder-track';
      const bar = document.createElement('span');
      bar.className = 'ladder-bar';
      bar.style.width = `${scaledRatio * 100}%`;
      track.append(bar);
      const energy = document.createElement('span');
      energy.className = 'ladder-energy';
      energy.textContent = `${index * index}`;
      row.append(label, track, energy);
      ladder.append(row);
    }

    ladder.setAttribute('aria-label', `Quantized electron energy levels from n equals 1 to ${MAX_N}; selected state n equals ${n}. Energy ratio E over E1. Well width ${widthNm.toFixed(2)} nanometres.`);
  }

  function showMeasurement(fraction) {
    measuredFraction = fraction;
    measurementMark.classList.remove('is-hidden');
    const x = 72 + fraction * 576;
    measurementLine.setAttribute('x1', x.toFixed(2));
    measurementLine.setAttribute('x2', x.toFixed(2));
    measurementDot.setAttribute('cx', x.toFixed(2));
    measurementLabel.setAttribute('x', x.toFixed(2));
    measurementLabel.textContent = `x = ${(fraction * widthNm).toFixed(3)} nm`;
    const probability = probabilityDensity(n, fraction, widthNm);
    measureFeedback.textContent = `Measured at x = ${(fraction * widthNm).toFixed(3)} nm (${(fraction * 100).toFixed(1)}% of the box). Measure again to draw another sample.`;
    measureButton.setAttribute('aria-label', `Measure the particle again. Last measured at ${((fraction * widthNm).toFixed(3))} nanometres, probability density ${probability.toFixed(3)} per nanometre.`);
    drawCharts();
  }

  function probabilityDensity(state, fraction, width) {
    return (2 / width) * Math.sin(state * Math.PI * fraction) ** 2;
  }

  function measurePosition() {
    // Rejection-sample x uniformly until it is accepted by the normalized
    // density sin²(nπx/L), whose maximum is 1 for every n.
    let fraction;
    do {
      fraction = Math.random();
    } while (Math.random() > Math.sin(n * Math.PI * fraction) ** 2);
    showMeasurement(fraction);
  }

  function drawAxes(ctx, width, height, pad, yTop, yBottom) {
    const innerWidth = width - pad.left - pad.right;
    const innerHeight = yBottom - yTop;
    ctx.strokeStyle = '#e8e5dc';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 2; i += 1) {
      const y = yTop + (innerHeight * i) / 2;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(width - pad.right, y);
      ctx.stroke();
    }
    ctx.strokeStyle = '#d5d1c7';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, yBottom);
    ctx.lineTo(width - pad.right, yBottom);
    ctx.stroke();
    if (measuredFraction !== null) {
      const measuredX = pad.left + measuredFraction * innerWidth;
      ctx.save();
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = 'rgba(197,104,67,.48)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(measuredX, yTop);
      ctx.lineTo(measuredX, yBottom);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#c56843';
      ctx.beginPath();
      ctx.arc(measuredX, yBottom, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    return { innerWidth, innerHeight, xFor: fraction => pad.left + fraction * innerWidth };
  }

  function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const pixelWidth = Math.round(rect.width * dpr);
    const pixelHeight = Math.round(rect.height * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, width: rect.width, height: rect.height };
  }

  function drawWavefunction() {
    const setup = setupCanvas(waveCanvas);
    if (!setup) return;
    const { ctx, width, height } = setup;
    const pad = { left: 8, right: 8, top: 10, bottom: 11 };
    const yTop = pad.top;
    const yBottom = height - pad.bottom;
    const { innerWidth, innerHeight, xFor } = drawAxes(ctx, width, height, pad, yTop, yBottom);
    const mid = yTop + innerHeight / 2;
    const amplitude = innerHeight * 0.37 * Math.sqrt(0.5 / widthNm);
    const samples = Math.max(240, Math.round(width * 2));
    const toY = fraction => mid - Math.sqrt(2) * Math.sin(n * Math.PI * fraction) * amplitude;

    ctx.save();
    ctx.beginPath();
    for (let i = 0; i <= samples; i += 1) {
      const x = xFor(i / samples);
      const y = toY(i / samples);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(xFor(1), mid);
    ctx.lineTo(xFor(0), mid);
    ctx.closePath();
    ctx.fillStyle = 'rgba(47,121,109,.07)';
    ctx.fill();
    ctx.beginPath();
    for (let i = 0; i <= samples; i += 1) {
      const x = xFor(i / samples);
      const y = toY(i / samples);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineWidth = 2.15;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2f796d';
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = '#bbb7ab';
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.left, mid);
    ctx.lineTo(width - pad.right, mid);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#85877d';
    ctx.font = '9px "DM Mono", monospace';
    ctx.fillText('0', 9, mid - 5);
    ctx.fillText(`max ψ ${Math.sqrt(2 / widthNm).toFixed(2)} nm⁻¹ᐟ²`, pad.left, yTop + 9);
    ctx.fillStyle = '#2f796d';
    ctx.fillText(`n = ${n}`, width - 34, yTop + 9);
  }

  function drawProbability() {
    const setup = setupCanvas(densityCanvas);
    if (!setup) return;
    const { ctx, width, height } = setup;
    const pad = { left: 8, right: 8, top: 10, bottom: 11 };
    const yTop = pad.top;
    const yBottom = height - pad.bottom;
    const { innerWidth, innerHeight, xFor } = drawAxes(ctx, width, height, pad, yTop, yBottom);
    const samples = Math.max(240, Math.round(width * 2));
    const yFor = fraction => yBottom - (Math.sin(n * Math.PI * fraction) ** 2) * innerHeight * 0.91 * (0.5 / widthNm);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(xFor(0), yBottom);
    for (let i = 0; i <= samples; i += 1) {
      const fraction = i / samples;
      ctx.lineTo(xFor(fraction), yFor(fraction));
    }
    ctx.lineTo(xFor(1), yBottom);
    ctx.closePath();
    ctx.fillStyle = 'rgba(197,104,67,.15)';
    ctx.fill();
    ctx.beginPath();
    for (let i = 0; i <= samples; i += 1) {
      const fraction = i / samples;
      if (i === 0) ctx.moveTo(xFor(fraction), yFor(fraction));
      else ctx.lineTo(xFor(fraction), yFor(fraction));
    }
    ctx.strokeStyle = '#c56843';
    ctx.lineWidth = 2.15;
    ctx.lineJoin = 'round';
    ctx.stroke();

    for (let node = 1; node < n; node += 1) {
      const fraction = node / n;
      const x = xFor(fraction);
      ctx.fillStyle = '#fbfaf6';
      ctx.strokeStyle = '#c56843';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(x, yBottom, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = '#85877d';
    ctx.font = '9px "DM Mono", monospace';
    ctx.fillText('0', 9, yBottom - 5);
    ctx.fillText(`max ρ ${(2 / widthNm).toFixed(2)} nm⁻¹`, pad.left, yTop + 9);
    ctx.fillStyle = '#c56843';
    ctx.fillText(`${n - 1} NODE${n === 2 ? '' : 'S'}`, Math.max(9, width - 72), yTop + 9);
    void innerWidth;
  }

  function drawCharts() {
    drawWavefunction();
    drawProbability();
  }

  function render() {
    n = Number(stateInput.value);
    widthNm = Number(widthInput.value);
    measuredFraction = null;
    measurementMark.classList.add('is-hidden');
    measureFeedback.textContent = 'Before measurement, position is described by probability.';
    measureButton.setAttribute('aria-label', 'Measure the particle position, sampled from the displayed probability density');

    stateOutput.textContent = `n = ${n}`;
    widthOutput.innerHTML = `${widthNm.toFixed(2)} <small>nm</small>`;
    boxWidthCaption.textContent = `L = ${widthNm.toFixed(2)} nm`;
    densityAxisEnd.textContent = `${widthNm.toFixed(2)} nm`;
    const groundEnergy = energyFor(1, widthNm);
    const selectedEnergy = energyFor(n, widthNm);
    energyValue.textContent = selectedEnergy < 0.01 ? selectedEnergy.toFixed(4) : selectedEnergy.toFixed(3);
    energyLevel.textContent = `E${['₁', '₂', '₃', '₄', '₅'][n - 1]}`;
    energyE1.textContent = `E₁ = ${groundEnergy < 0.01 ? groundEnergy.toFixed(4) : groundEnergy.toFixed(3)} eV`;
    ladderSelectedLabel.textContent = `n = ${n}`;
    stateInput.setAttribute('aria-valuetext', `n equals ${n}`);
    widthInput.setAttribute('aria-valuetext', `${widthNm.toFixed(2)} nanometres`);
    setRangeProgress(stateInput);
    setRangeProgress(widthInput);
    buildLadder();
    drawCharts();
  }

  stateInput.addEventListener('input', render);
  widthInput.addEventListener('input', render);
  measureButton.addEventListener('click', measurePosition);

  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => drawCharts());
    resizeObserver.observe(waveCanvas.parentElement);
    resizeObserver.observe(densityCanvas.parentElement);
  } else {
    window.addEventListener('resize', drawCharts, { passive: true });
  }

  render();
})();
