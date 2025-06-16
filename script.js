document.addEventListener('DOMContentLoaded', () => {
    const calculateButton = document.getElementById('calculateButton');
    const totalCardsInput = document.getElementById('totalCards'); // 変更
    const numBInput = document.getElementById('numB');
    const nValueInput = document.getElementById('nValue');
    const oValueInput = document.getElementById('oValue');
    const pValueInput = document.getElementById('pValue');
    const numTrialsInput = document.getElementById('numTrials');
    const numSimulationsInput = document.getElementById('numSimulations');
    
    const expectedValueSpan = document.getElementById('expectedValue');
    const probabilitiesDiv = document.getElementById('probabilities');
    const loadingSpinner = document.getElementById('loadingSpinner');

    calculateButton.addEventListener('click', async () => {
        const totalCards = parseInt(totalCardsInput.value); // 変更
        const numB = parseInt(numBInput.value);
        const n = parseInt(nValueInput.value);
        const o = parseInt(oValueInput.value);
        const p = parseInt(pValueInput.value);
        const numTrialsPerSimulation = parseInt(numTrialsInput.value);
        const numSimulations = parseInt(numSimulationsInput.value);

        // --- UIの更新（計算開始前） ---
        calculateButton.disabled = true;
        calculateButton.textContent = '計算中...';
        loadingSpinner.style.display = 'block';
        expectedValueSpan.textContent = '--';
        probabilitiesDiv.innerHTML = '';

        // 入力値のバリデーション
        if (isNaN(totalCards) || isNaN(numB) || isNaN(n) || isNaN(o) || isNaN(p) || isNaN(numTrialsPerSimulation) || isNaN(numSimulations)) {
            alert('全ての項目に数値を入力してください。');
            resetUI();
            return;
        }
        if (totalCards < 1 || numB < 0 || numB > totalCards || n < 0 || o < 0 || p < 0 || numTrialsPerSimulation < 1 || numSimulations < 1000) {
            alert('無効な入力値があります。総枚数は1以上、Bの枚数は0以上かつ総枚数以下、その他の枚数は0以上、繰り返し回数とシミュレーション回数は適切な値を入力してください。');
            resetUI();
            return;
        }
        const numA = totalCards - numB; // Aの枚数を計算
        if (numA < 0) { // 理論上はnumB > totalCardsで弾かれるが念のため
             alert('Bの枚数が総枚数を超えています。');
             resetUI();
             return;
        }


        // 計算実行を非同期で行う (UIがフリーズしないように)
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            // calculateExpectedValueの引数を変更
            const { expectedValue, probabilities } = calculateExpectedValue(
                numA, numB, n, o, p, numTrialsPerSimulation, numSimulations
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

    // UIを初期状態に戻すヘルパー関数
    function resetUI() {
        calculateButton.disabled = false;
        calculateButton.textContent = '計算実行';
        loadingSpinner.style.display = 'none';
    }


    /**
     * 指定された条件で最終的にめくった枚数の総数の期待値を計算します。
     * 「n枚、o枚、p枚めくる」という一連の試行をnumTrialsPerSimulation回繰り返します。
     *
     * @param {number} numA Aのカードの枚数 (総枚数 - Bの枚数で計算される)
     * @param {number} numB Bのカードの枚数
     * @param {number} n 最初の試行でめくる枚数
     * @param {number} o 2番目の試行でめくる枚数
     * @param {number} p 3番目の試行でめくる枚数
     * @param {number} numTrialsPerSimulation 各シミュレーション内で「n,o,pの試行」を繰り返す回数
     * @param {number} numSimulations シミュレーションの総回数
     * @returns {{expectedValue: number, probabilities: Object}} 期待値と各枚数とその確率の辞書
     */
    function calculateExpectedValue(numA, numB, n, o, p, numTrialsPerSimulation, numSimulations) {
        const totalDrawnCardsHistory = [];

        for (let i = 0; i < numSimulations; i++) {
            let currentSimulationTotalDrawnCards = 0; // 現在の1回のシミュレーションでめくった総数

            for (let j = 0; j < numTrialsPerSimulation; j++) {
                let currentSetDrawnCards = 0; // 現在の「n,o,p」セットでめくった枚数
                
                // 各セットの開始時に山札を初期化してシャッフル
                let deck = Array(numA).fill('A').concat(Array(numB).fill('B'));
                // Fisher-Yates shuffle
                for (let k = deck.length - 1; k > 0; k--) {
                    const l = Math.floor(Math.random() * (k + 1));
                    [deck[k], deck[l]] = [deck[l], deck[k]]; // 配列の要素を交換
                }
                
                let currentPhaseIndex = 0; // 0:n, 1:o, 2:p
                const phaseCounts = [n, o, p];
                
                // 各フェーズの処理
                while (currentPhaseIndex < phaseCounts.length) {
                    const cardsToDraw = phaseCounts[currentPhaseIndex];
                    let drawnInCurrentPhase = 0;
                    
                    for (let k = 0; k < cardsToDraw; k++) {
                        if (deck.length === 0) {
                            // 山札が尽きた場合: めくった総数に+1してこのフェーズを終了
                            currentSetDrawnCards++; 
                            break; // このフェーズのカードめくりを終了
                        }
                        
                        const card = deck.shift(); // 山札からカードを消費
                        if (card === 'B') {
                            drawnInCurrentPhase = 0; // Bが出たらこのフェーズは0枚とカウント
                            break; // このフェーズのカードめくりを終了
                        } else {
                            drawnInCurrentPhase++; // Aならカウント
                        }
                    }
                    currentSetDrawnCards += drawnInCurrentPhase; // フェーズでカウントされた枚数を合計に追加

                    currentPhaseIndex++; // いずれの場合も次のフェーズへ
                }
                currentSimulationTotalDrawnCards += currentSetDrawnCards; // 各セットでめくった枚数を合計
            }
            totalDrawnCardsHistory.push(currentSimulationTotalDrawnCards); // 最終的なめくった総数を記録
        }

        // 期待値の計算
        const expectedValue = totalDrawnCardsHistory.reduce((sum, val) => sum + val, 0) / totalDrawnCardsHistory.length;

        // 各枚数と確率の計算
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
});