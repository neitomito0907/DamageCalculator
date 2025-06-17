document.addEventListener('DOMContentLoaded', () => {
    const calculateButton = document.getElementById('calculateButton');
    const totalCardsInput = document.getElementById('totalCards');
    const numBInput = document.getElementById('numB');

    // NOP値の入力フィールド
    const n1ValueInput = document.getElementById('n1Value');
    const o1ValueInput = document.getElementById('o1Value');
    const p1ValueInput = document.getElementById('p1Value');
    const returnA1Input = document.getElementById('returnA1');
    const timing1Radios = document.querySelectorAll('input[name="timing1"]'); // 新しい取得

    const n2ValueInput = document.getElementById('n2Value');
    const o2ValueInput = document.getElementById('o2Value');
    const p2ValueInput = document.getElementById('p2Value');
    const returnA2Input = document.getElementById('returnA2');
    const timing2Radios = document.querySelectorAll('input[name="timing2"]'); // 新しい取得

    const n3ValueInput = document.getElementById('n3Value');
    const o3ValueInput = document.getElementById('o3Value');
    const p3ValueInput = document.getElementById('p3Value');
    const returnA3Input = document.getElementById('returnA3');
    const timing3Radios = document.querySelectorAll('input[name="timing3"]'); // 新しい取得
    
    const numSimulationsInput = document.getElementById('numSimulations');
    
    const expectedValueSpan = document.getElementById('expectedValue');
    const probabilitiesDiv = document.getElementById('probabilities');
    const loadingSpinner = document.getElementById('loadingSpinner');

    calculateButton.addEventListener('click', async () => {
        const totalCards = parseInt(totalCardsInput.value);
        const numB = parseInt(numBInput.value);

        // 各回の n, o, p, returnA, timing の値を取得
        const n1 = parseInt(n1ValueInput.value);
        const o1 = parseInt(o1ValueInput.value);
        const p1 = parseInt(p1ValueInput.value);
        const returnA1 = parseInt(returnA1Input.value);
        const timing1 = getSelectedRadioValue(timing1Radios); // 新しい取得

        const n2 = parseInt(n2ValueInput.value);
        const o2 = parseInt(o2ValueInput.value);
        const p2 = parseInt(p2ValueInput.value);
        const returnA2 = parseInt(returnA2Input.value);
        const timing2 = getSelectedRadioValue(timing2Radios); // 新しい取得

        const n3 = parseInt(n3ValueInput.value);
        const o3 = parseInt(o3ValueInput.value);
        const p3 = parseInt(p3ValueInput.value);
        const returnA3 = parseInt(returnA3Input.value);
        const timing3 = getSelectedRadioValue(timing3Radios); // 新しい取得

        const numSimulations = parseInt(numSimulationsInput.value);

        // --- UIの更新（計算開始前） ---
        calculateButton.disabled = true;
        calculateButton.textContent = '計算中...';
        loadingSpinner.style.display = 'block';
        expectedValueSpan.textContent = '--';
        probabilitiesDiv.innerHTML = '';

        // 入力値のバリデーション
        if (isNaN(totalCards) || isNaN(numB) || 
            isNaN(n1) || isNaN(o1) || isNaN(p1) || isNaN(returnA1) || !timing1 ||
            isNaN(n2) || isNaN(o2) || isNaN(p2) || isNaN(returnA2) || !timing2 ||
            isNaN(n3) || isNaN(o3) || isNaN(p3) || isNaN(returnA3) || !timing3 ||
            isNaN(numSimulations)) {
            alert('全ての項目に数値を入力してください。または、戻すタイミングを選択してください。');
            resetUI();
            return;
        }
        if (totalCards < 1 || numB < 0 || numB > totalCards || 
            n1 < 0 || o1 < 0 || p1 < 0 || returnA1 < 0 ||
            n2 < 0 || o2 < 0 || p2 < 0 || returnA2 < 0 ||
            n3 < 0 || o3 < 0 || p3 < 0 || returnA3 < 0 ||
            numSimulations < 1000) {
            alert('無効な入力値があります。総枚数は1以上、Bの枚数は0以上かつ総枚数以下、各めくり枚数とAを戻す枚数は0以上、シミュレーション回数は適切な値を入力してください。');
            resetUI();
            return;
        }
        const numA = totalCards - numB;

        // 計算実行を非同期で行う (UIがフリーズしないように)
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            // calculateExpectedValue_withReturnの引数を変更
            const { expectedValue, probabilities } = calculateExpectedValue_withReturn(
                numA, numB, 
                { n: n1, o: o1, p: p1, returnA: returnA1, timing: timing1 }, // 1回目の試行オブジェクト
                { n: n2, o: o2, p: p2, returnA: returnA2, timing: timing2 }, // 2回目の試行オブジェクト
                { n: n3, o: o3, p: p3, returnA: returnA3, timing: timing3 }, // 3回目の試行オブジェクト
                numSimulations
            );

            // 結果表示
            expectedValueSpan.textContent = expectedValue.toFixed(4);
            
            Object.entries(probabilities)
                .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                .forEach(([count, prob]) => {
                    const pElement = document.createElement('div');
                    pElement.innerHTML = `<span>${count}枚:</span> <span>${(prob * 100).toFixed(2)}%</span>`;
                    probabilitiesDiv.appendChild(pElement);
                });
        } catch (error) {
            console.error("計算中にエラーが発生しました:", error);
            alert("計算中にエラーが発生しました。入力値を確認してください。");
            expectedValueSpan.textContent = 'エラー';
            probabilitiesDiv.innerHTML = '<p>計算中にエラーが発生しました。</p>';
        } finally {
            // --- UIの更新（計算終了後） ---
            resetUI();
        }
    });

    // 選択されたラジオボタンの値を取得するヘルパー関数
    function getSelectedRadioValue(radioElements) {
        for (const radio of radioElements) {
            if (radio.checked) {
                return radio.value;
            }
        }
        return null; // どれも選択されていない場合
    }

    // UIを初期状態に戻すヘルパー関数
    function resetUI() {
        calculateButton.disabled = false;
        calculateButton.textContent = '計算実行';
        loadingSpinner.style.display = 'none';
    }


    /**
     * 指定された条件で最終的にめくった枚数の総数の期待値を計算します。
     * 各試行セットで指定された n,o,p の値を使用し、指定されたタイミングで指定枚数のAを山札に戻します。
     *
     * @param {number} initialNumA 最初に山札にあるAの枚数
     * @param {number} initialNumB 最初に山札にあるBの枚数
     * @param {object} trial1Config 1回目の試行 {n, o, p, returnA, timing}
     * @param {object} trial2Config 2回目の試行 {n, o, p, returnA, timing}
     * @param {object} trial3Config 3回目の試行 {n, o, p, returnA, timing}
     * @param {number} numSimulations シミュレーションの総回数
     * @returns {{expectedValue: number, probabilities: Object}} 期待値と各枚数とその確率の辞書
     */
    function calculateExpectedValue_withReturn(initialNumA, initialNumB, trial1Config, trial2Config, trial3Config, numSimulations) {
        const totalDrawnCardsHistory = [];
        const allTrialConfigs = [trial1Config, trial2Config, trial3Config];

        for (let i = 0; i < numSimulations; i++) {
            let currentSimulationTotalDrawnCards = 0;
            
            // 各シミュレーションの開始時に、**このシミュレーション全体の**山札を初期化
            let currentDeck = [];
            for (let k = 0; k < initialNumA; k++) currentDeck.push('A');
            for (let k = 0; k < initialNumB; k++) currentDeck.push('B');
            
            // 各試行セット (N,O,Pの組み合わせ) の処理
            for (let j = 0; j < allTrialConfigs.length; j++) {
                const trialConfig = allTrialConfigs[j];
                const n = trialConfig.n;
                const o = trialConfig.o;
                const p = trialConfig.p;
                const returnACount = trialConfig.returnA;
                const returnTiming = trialConfig.timing;

                let currentSetDrawnCards = 0; // この試行セットでめくった枚数

                // 「Nの前」でAを戻す処理
                if (returnTiming === 'beforeN') {
                    for (let k = 0; k < returnACount; k++) {
                        currentDeck.push('A');
                    }
                }

                // 各試行セットの開始時に山札をシャッフル
                shuffleArray(currentDeck); // Fisher-Yates shuffle
                
                let currentPhaseIndex = 0; // 0:n, 1:o, 2:p
                const phaseCounts = [n, o, p];
                
                // 各フェーズの処理
                while (currentPhaseIndex < phaseCounts.length) {
                    const cardsToDraw = phaseCounts[currentPhaseIndex];
                    let drawnInCurrentPhase = 0;
                    
                    // 「Oの前」でAを戻す処理
                    if (currentPhaseIndex === 1 && returnTiming === 'beforeO') { // Oのフェーズ開始前
                        for (let k = 0; k < returnACount; k++) {
                            currentDeck.push('A');
                        }
                        shuffleArray(currentDeck); // 戻した後にシャッフル
                    }
                    // 「Pの前」でAを戻す処理
                    if (currentPhaseIndex === 2 && returnTiming === 'beforeP') { // Pのフェーズ開始前
                        for (let k = 0; k < returnACount; k++) {
                            currentDeck.push('A');
                        }
                        shuffleArray(currentDeck); // 戻した後にシャッフル
                    }

                    for (let k = 0; k < cardsToDraw; k++) {
                        if (currentDeck.length === 0) {
                            currentSetDrawnCards++; // 山札切れで+1
                            break; 
                        }
                        
                        const card = currentDeck.shift(); // 山札からカードを消費

                        if (card === 'B') {
                            drawnInCurrentPhase = 0; // Bが出たらカウント0
                            break; 
                        } else {
                            drawnInCurrentPhase++; 
                        }
                    }
                    currentSetDrawnCards += drawnInCurrentPhase;

                    currentPhaseIndex++; 
                }
                currentSimulationTotalDrawnCards += currentSetDrawnCards; // このセットでめくった枚数を合計に追加

                // 「処理セット後」でAを戻す処理
                if (returnTiming === 'afterSet') {
                    for (let k = 0; k < returnACount; k++) {
                        currentDeck.push('A');
                    }
                }
                // currentDeck は次の試行セットで再びシャッフルされる
            }
            totalDrawnCardsHistory.push(currentSimulationTotalDrawnCards);
        }

        // 期待値と確率の計算 (変更なし)
        const expectedValue = totalDrawnCardsHistory.reduce((sum, val) => sum + val, 0) / totalDrawnCardsHistory.length;
        const drawnCounts = {};
        totalDrawnCardsHistory.forEach(count => {
            drawnCounts[count] = (drawnCounts[count] || 0) + 1;
        });
        const probabilities = {};
        for (const count in drawnCounts) {
            probabilities[count] = drawnCounts[count] / numSimulations;
        }

        return { expectedValue, probabilities };
    }

    // Fisher-Yates shuffle を独立したヘルパー関数として定義
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
});