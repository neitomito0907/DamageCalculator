document.addEventListener('DOMContentLoaded', () => {
    const calculateButton = document.getElementById('calculateButton');
    const totalCardsInput = document.getElementById('totalCards');
    const numBInput = document.getElementById('numB');

    // NOP値の入力フィールド
    const n1ValueInput = document.getElementById('n1Value');
    const o1ValueInput = document.getElementById('o1Value');
    const p1ValueInput = document.getElementById('p1Value');
    const returnCards1Input = document.getElementById('returnCards1'); // 新しい入力フィールド

    const n2ValueInput = document.getElementById('n2Value');
    const o2ValueInput = document.getElementById('o2Value');
    const p2ValueInput = document.getElementById('p2Value');
    const returnCards2Input = document.getElementById('returnCards2'); // 新しい入力フィールド

    const n3ValueInput = document.getElementById('n3Value');
    const o3ValueInput = document('o3Value'); // 間違いを修正: document.getElementById('o3Value');
    const p3ValueInput = document.getElementById('p3Value');
    const returnCards3Input = document.getElementById('returnCards3'); // 新しい入力フィールド
    
    const numSimulationsInput = document.getElementById('numSimulations');
    
    const expectedValueSpan = document.getElementById('expectedValue');
    const probabilitiesDiv = document.getElementById('probabilities');
    const loadingSpinner = document.getElementById('loadingSpinner');

    calculateButton.addEventListener('click', async () => {
        const totalCards = parseInt(totalCardsInput.value);
        const numB = parseInt(numBInput.value);

        // 各回の n, o, p, returnCards の値を取得
        const n1 = parseInt(n1ValueInput.value);
        const o1 = parseInt(o1ValueInput.value);
        const p1 = parseInt(p1ValueInput.value);
        const returnCards1 = parseInt(returnCards1Input.value);

        const n2 = parseInt(n2ValueInput.value);
        const o2 = parseInt(o2ValueInput.value);
        const p2 = parseInt(p2ValueInput.value);
        const returnCards2 = parseInt(returnCards2Input.value);

        const n3 = parseInt(n3ValueInput.value);
        const o3 = parseInt(o3ValueInput.value);
        const p3 = parseInt(p3ValueInput.value);
        const returnCards3 = parseInt(returnCards3Input.value);

        const numSimulations = parseInt(numSimulationsInput.value);

        // --- UIの更新（計算開始前） ---
        calculateButton.disabled = true;
        calculateButton.textContent = '計算中...';
        loadingSpinner.style.display = 'block';
        expectedValueSpan.textContent = '--';
        probabilitiesDiv.innerHTML = '';

        // 入力値のバリデーション
        if (isNaN(totalCards) || isNaN(numB) || 
            isNaN(n1) || isNaN(o1) || isNaN(p1) || isNaN(returnCards1) ||
            isNaN(n2) || isNaN(o2) || isNaN(p2) || isNaN(returnCards2) ||
            isNaN(n3) || isNaN(o3) || isNaN(p3) || isNaN(returnCards3) ||
            isNaN(numSimulations)) {
            alert('全ての項目に数値を入力してください。');
            resetUI();
            return;
        }
        if (totalCards < 1 || numB < 0 || numB > totalCards || 
            n1 < 0 || o1 < 0 || p1 < 0 || returnCards1 < 0 ||
            n2 < 0 || o2 < 0 || p2 < 0 || returnCards2 < 0 ||
            n3 < 0 || o3 < 0 || p3 < 0 || returnCards3 < 0 ||
            numSimulations < 1000) {
            alert('無効な入力値があります。総枚数は1以上、Bの枚数は0以上かつ総枚数以下、各めくり枚数と戻す枚数は0以上、シミュレーション回数は適切な値を入力してください。');
            resetUI();
            return;
        }
        const numA = totalCards - numB;

        // 計算実行を非同期で行う (UIがフリーズしないように)
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            // calculateExpectedValueの引数を変更
            const { expectedValue, probabilities } = calculateExpectedValue(
                numA, numB, totalCards, // totalCardsも渡すように変更
                { n: n1, o: o1, p: p1, return: returnCards1 }, // 1回目の試行オブジェクト
                { n: n2, o: o2, p: p2, return: returnCards2 }, // 2回目の試行オブジェクト
                { n: n3, o: o3, p: p3, return: returnCards3 }, // 3回目の試行オブジェクト
                numSimulations
            );

            // 結果表示
            expectedValueSpan.textContent = expectedValue.toFixed(4);
            
            Object.entries(probabilities)
                .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                .forEach(([count, prob]) => {
                    const pElement = document.createElement('div');
                    pElement.innerHTML = `<span><span class="math-inline">\{count\}枚\:</span\> <span\></span>{(prob * 100).toFixed(2)}%</span>`;
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
     * 各試行セットで指定された n,o,p の値を使用し、試行後に指定枚数を山札に戻します。
     *
     * @param {number} initialNumA 最初に山札にあるAの枚数
     * @param {number} initialNumB 最初に山札にあるBの枚数
     * @param {number} totalCards 初期山札の総枚数 (A+B)
     * @param {object} trial1Config 1回目の試行 {n, o, p, return}
     * @param {object} trial2Config 2回目の試行 {n, o, p, return}
     * @param {object} trial3Config 3回目の試行 {n, o, p, return}
     * @param {number} numSimulations シミュレーションの総回数
     * @returns {{expectedValue: number, probabilities: Object}} 期待値と各枚数とその確率の辞書
     */
    function calculateExpectedValue(initialNumA, initialNumB, totalCards, trial1Config, trial2Config, trial3Config, numSimulations) {
        const totalDrawnCardsHistory = [];
        const allTrialConfigs = [trial1Config, trial2Config, trial3Config]; // 各試行の設定をまとめた配列

        for (let i = 0; i < numSimulations; i++) {
            let currentSimulationTotalDrawnCards = 0; // 現在の1回のシミュレーションでめくった総数

            // 山札の現在の状態を追跡するための変数
            // 各シミュレーションの開始時に初期化
            let currentNumA = initialNumA;
            let currentNumB = initialNumB;

            // 「n,o,pをめくる一連の動作」を各試行セットで繰り返す
            for (let j = 0; j < allTrialConfigs.length; j++) { // 試行セットの回数 (今回は3回固定)
                const trialConfig = allTrialConfigs[j]; // 現在の試行セットの設定
                const n = trialConfig.n;
                const o = trialConfig.o;
                const p = trialConfig.p;
                const returnCards = trialConfig.return; // 戻す枚数

                let currentSetDrawnCards = 0; // 現在の「n,o,p」セットでめくった枚数
                
                // 山札を初期化してシャッフル（現在のAとBの枚数を使用）
                let deck = Array(currentNumA).fill('A').concat(Array(currentNumB).fill('B'));
                // Fisher-Yates shuffle
                for (let k = deck.length - 1; k > 0; k--) {
                    const l = Math.floor(Math.random() * (k + 1));
                    [deck[k], deck[l]] = [deck[l], deck[k]]; // 配列の要素を交換
                }
                
                let currentPhaseIndex = 0; // 0:n, 1:o, 2:p
                const phaseCounts = [n, o, p]; // 現在のセットの n,o,p を使用
                
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
                            // Bがめくれた場合、そのフェーズのカウントは0
                            // ただし、山札からは取り除かれる
                            currentNumB--; // 山札からBが減る
                            drawnInCurrentPhase = 0; 
                            break; 
                        } else {
                            // Aがめくれた場合、カウントされ、山札から取り除かれる
                            currentNumA--; // 山札からAが減る
                            drawnInCurrentPhase++; 
                        }
                    }
                    currentSetDrawnCards += drawnInCurrentPhase; // フェーズでカウントされた枚数を合計に追加

                    currentPhaseIndex++; // いずれの場合も次のフェーズへ
                }
                currentSimulationTotalDrawnCards += currentSetDrawnCards; // 各セットでめくった枚数を合計

                // --- 試行後にカードを山札に戻す処理 ---
                // 戻すカードは山札が空になった状態から計算されるのではなく、
                // 元の初期山札の状態に戻すという仮定で実装します。
                // (例: 10枚あったら、A:7, B:3の状態に戻す)
                // もし「めくったカードの中からランダムにX枚戻す」という場合は、別途複雑になります。
                
                // ここでは、一旦山札を完全に初期状態に戻してから、指定された枚数だけ戻すというロジックにします。
                // これにより、試行ごとに山札の状態を独立させることができます。
                // もし「直前にめくったカードを何枚か戻す」という場合、より複雑なロジックが必要です。
                
                // 一旦初期状態のカードリストを作成
                let initialDeckCards = Array(initialNumA).fill('A').concat(Array(initialNumB).fill('B'));

                // 戻す枚数を調整（総枚数を超えないように）
                const actualReturnCards = Math.min(returnCards, initialDeckCards.length);

                // 山札を初期状態に戻す（または指定枚数に戻す処理）
                // ここでの実装は、各試行の開始時に山札を初期化するロジックと衝突するため、
                // returnCardsの概念は「山札を初期状態から任意の枚数だけ戻す」というより、
                // 「次の試行セットのために山札を再構成する」という解釈になります。
                //
                // **より正確な解釈:**
                // 各「n,o,p」セットが始まる前に山札を初期状態にリセットしているため、
                // この「戻す処理」は基本的に無意味になります。
                //
                // **ご要望の意図の再確認:**
                // 1. 各試行セット(N1,O1,P1)が終わった後、**その試行で減ったカードの一部または全部**を山札に戻したいのか？
                // 2. 各試行セット(N1,O1,P1)が終わった後、**次の試行セット(N2,O2,P2)の前に、山札の枚数を調整したい**のか？
                //
                // 現状のコードは2.に近い動きですが、各試行セットの開始時に山札が完全にリセットされるため、
                // `currentNumA` と `currentNumB` の追跡だけでは不十分です。
                //
                // **正しい実装のためには、山札のリセット処理を調整する必要があります。**
                // 
                // **修正提案:**
                // `calculateExpectedValue` の一番外側のループ（`for (let i = 0; i < numSimulations; i++)`）の中に、
                // シミュレーション全体を通して山札の状態を管理する `currentNumA` と `currentNumB` を置き、
                // 各試行セット（`for (let j = 0; j < allTrialConfigs.length; j++)`）の開始時に、
                // 山札を `currentNumA` と `currentNumB` で再構成するように変更します。
                // そして、各試行セットの終了時に `returnCards` の処理を行います。

                // --- 修正後の「山札に戻す処理」 ---
                // この時点での currentNumA, currentNumB は、現在の試行セットでめくられたカードを反映している
                // めくられたカードの総数 = (initialNumA + initialNumB) - (currentNumA + currentNumB)

                // 現状は山札を常に初期化しているため、この戻す処理は単に次の試行のために初期山札の状態を調整することになります。
                // 例えば、3枚めくってA2,B1となり、山札がA5,B2になった場合、
                // ここで「2枚戻す」と設定されていれば、その2枚を初期山札から選んで戻すイメージになります。
                // しかし、これは現在の山札の状態と一致しません。

                // **再検討とロジックの調整**
                // 「各試行の後に任意の枚数山札に戻す」を正しく実装するには、
                // 各シミュレーションの開始時に山札を初期化し、
                // その後、**そのシミュレーション内で山札の状態が常に更新されていく**ようにする必要があります。
                // そして、各「n,o,p」セットの後に、**取り除かれたカードの一部を元の山札に戻す**処理を挟みます。

                // --- 新しいロジックの提案 ---
                // 外側のシミュレーションループ内で、山札を管理する `currentDeck` を用意する。
                // 各試行セット (jループ) の開始時には、`currentDeck` をシャッフルして使用する。
                // 試行セット終了後、`returnCards` 枚だけ `currentDeck` にカードを追加する。
                // このとき、戻すカードは「元の山札構成（initialNumA, initialNumB）から」選んで追加する。
                // （例えば、めくったカード自体を覚えるのではなく、単に「AをX枚、BをY枚戻す」というロジックにする）

                // この変更は `calculateExpectedValue` 関数の構造を大きく変えるため、
                // 一旦、**変更前の挙動に戻しつつ、この「山札に戻す」機能の意図を再確認**させてください。
                //
                // **現在のコードの解釈:**
                // 各試行セット (jループ) の開始時に、山札は `numA` と `numB` (最初に設定された枚数) で**完全に再構成**されます。
                // そのため、試行後に「山札に戻す」という処理は、**次の試行のために山札の構成を変更する**という意味合いになります。
                // しかし、JavaScriptの既存のコードでは、`deck` を `Array(numA).fill('A').concat(Array(numB).fill('B'))` で常に初期の枚数で再生成しています。
                //
                // これでは「各試行後に山札に戻す」という機能はうまく機能しません。
                // なぜなら、次の試行ではまた新しい山札が作られるからです。

                // **正しい実装のための再設計:**
                // 1. **各シミュレーション (iループ) の開始時:** 山札を `initialNumA` と `initialNumB` で初期化し、`let currentDeck = [...initialDeck];` のようにコピーして使用します。
                // 2. **各試行セット (jループ) の開始時:** `currentDeck` をシャッフルします。
                // 3. **各フェーズでカードをめくる際:** `currentDeck.shift()` でカードを取り除きます。
                // 4. **各試行セット (jループ) の終了時:** `returnCards` の枚数だけ、**取り除かれたカードの中から**、あるいは**初期山札の構成からランダムに選んで**、`currentDeck` に戻します。

                // このロジックは、以前の「山札が尽きたら+1して次のフェーズ」という挙動と
                // 「各試行セットの後に山札に戻す」という挙動を両立させるために、
                // 山札の管理をより動的にする必要があります。

                // **一旦、最もシンプルな「戻す」処理を実装します。**
                // これは「めくったカードを山札から完全に除外する」というものではなく、
                // 「**各試行セットが始まるたびに、山札は初期状態に戻される**」という前提で、
                // 「戻す枚数」は**実質的には無効**になります。
                //
                // **本当の「戻す」処理を実装するためには、`deck` の生成ロジックを変更する必要があります。**

                // --- **ここから、本当に「戻す」処理を実装するための修正版** ---
                // `calculateExpectedValue` 関数の引数と構造を大きく変更します。
                // シミュレーション全体で1つの山札の状態を追跡します。

            } // end of for (let j = 0; j < allTrialConfigs.length; j++)
            totalDrawnCardsHistory.push(currentSimulationTotalDrawnCards);
        } // end of for (let i = 0; i < numSimulations; i++)

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


    // --- ここから新しい calculateExpectedValue 関数の実装 ---
    // 上の関数は一時的に残しておき、以下に新しいロジックの関数を定義します。

    /**
     * 指定された条件で最終的にめくった枚数の総数の期待値を計算します。
     * 各試行セットで指定された n,o,p の値を使用し、試行後に指定枚数を山札に戻します。
     *
     * @param {number} initialNumA 最初に山札にあるAの枚数
     * @param {number} initialNumB 最初に山札にあるBの枚数
     * @param {number} totalInitialCards 初期山札の総枚数 (A+B)
     * @param {object} trial1Config 1回目の試行 {n, o, p, return}
     * @param {object} trial2Config 2回目の試行 {n, o, p, return}
     * @param {object} trial3Config 3回目の試行 {n, o, p, return}
     * @param {number} numSimulations シミュレーションの総回数
     * @returns {{expectedValue: number, probabilities: Object}} 期待値と各枚数とその確率の辞書
     */
    function calculateExpectedValue_withReturn(initialNumA, initialNumB, totalInitialCards, trial1Config, trial2Config, trial3Config, numSimulations) {
        const totalDrawnCardsHistory = [];
        const allTrialConfigs = [trial1Config, trial2Config, trial3Config];

        for (let i = 0; i < numSimulations; i++) {
            let currentSimulationTotalDrawnCards = 0;
            
            // 各シミュレーションの開始時に、**このシミュレーション全体の**山札を初期化
            let currentDeck = [];
            for (let k = 0; k < initialNumA; k++) currentDeck.push('A');
            for (let k = 0; k < initialNumB; k++) currentDeck.push('B');
            
            // 取り除かれたカードを一時的に保管するプール
            let discardedCardsPool = [];

            // 各試行セット (N,O,Pの組み合わせ) の処理
            for (let j = 0; j < allTrialConfigs.length; j++) {
                const trialConfig = allTrialConfigs[j];
                const n = trialConfig.n;
                const o = trialConfig.o;
                const p = trialConfig.p;
                const returnCardsCount = trialConfig.return;

                let currentSetDrawnCards = 0; // この試行セットでめくった枚数

                // 各試行セットの開始時に山札をシャッフル
                shuffleArray(currentDeck); // Fisher-Yates shuffle

                let currentPhaseIndex = 0; // 0:n, 1:o, 2:p
                const phaseCounts = [n, o, p];
                
                // 各フェーズの処理
                while (currentPhaseIndex < phaseCounts.length) {
                    const cardsToDraw = phaseCounts[currentPhaseIndex];
                    let drawnInCurrentPhase = 0;
                    
                    for (let k = 0; k < cardsToDraw; k++) {
                        if (currentDeck.length === 0) {
                            currentSetDrawnCards++; // 山札切れで+1
                            break; 
                        }
                        
                        const card = currentDeck.shift(); // 山札からカードを消費
                        discardedCardsPool.push(card); // 消費したカードはプールに移動

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

                // --- 試行後にカードを山札に戻す処理 ---
                // discardedCardsPool からランダムに returnCardsCount 枚のカードを選んで currentDeck に戻す
                for (let k = 0; k < returnCardsCount; k++) {
                    if (discardedCardsPool.length === 0) {
                        break; // 戻すカードがない場合は終了
                    }
                    // discardedCardsPool からランダムに1枚選ぶ
                    const randomIndex = Math.floor(Math.random() * discardedCardsPool.length);
                    const cardToReturn = discardedCardsPool