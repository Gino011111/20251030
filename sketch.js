let quizTable; // 儲存 CSV 資料的 p5.Table 物件
let questions = []; // 儲存格式化後的題目陣列
let currentQuestionIndex = 0;
let score = 0;
let quizState = 'QUIZ'; // 狀態：'QUIZ' (測驗中), 'RESULT' (顯示結果)

// --- 游標特效相關變數 ---
let cursorParticles = [];

// --- 介面元素變數 ---
let optionButtons = []; // 儲存選項的邊界資訊

// --- 結果動畫相關變數 ---
let resultAnimationTimer = 0;
let resultMessage = "";
let encouragementText = "";
let resultEffectType = 'NONE'; // 特效類型: 'PERFECT', 'GOOD', 'OKAY', 'LOW'
let effectParticles = []; // 一個統一的陣列來管理所有特效粒子

// --- 特效顏色 ---
const confettiColors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
                        '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
                        '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800'];

// --- 響應式設計：基準尺寸 (用於計算比例) ---
const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;

function preload() {
    quizTable = loadTable('data/quiz.csv', 'csv', 'header');
}

function setup() {
    // 讓畫布初始就佔滿視窗
    createCanvas(windowWidth, windowHeight);
    
    textAlign(CENTER, CENTER);
    noStroke();
    noCursor();

    // 格式化 CSV 資料並**初始化隨機選項**
    for (let r = 0; r < quizTable.getRowCount(); r++) {
        let row = quizTable.getRow(r);
        let allOptions = [
            row.getString('optionA'),
            row.getString('optionB'),
            row.getString('optionC')
        ];
        
        questions.push({
            question: row.getString('question'),
            // 將所有選項儲存起來，每次顯示時再進行洗牌
            allOptions: allOptions,
            correct: row.getString('correct'),
            // 儲存當前題目的隨機選項順序
            shuffledOptions: shuffle(allOptions)
        });
    }

    // --- 直接在程式碼中新增兩個題目 ---
    let newQuestions = [
        {
            question: "p5.js 是基於哪種程式語言的函式庫？",
            allOptions: ["Java", "Python", "JavaScript"],
            correct: "JavaScript"
        },
        {
            question: "在 p5.js 中，哪個函數會在程式開始時只執行一次？",
            allOptions: ["draw()", "setup()", "mousePressed()"],
            correct: "setup()"
        }
    ];

    newQuestions.forEach(q => {
        questions.push({
            question: q.question,
            allOptions: q.allOptions,
            correct: q.correct,
            shuffledOptions: shuffle(q.allOptions) // 為新題目隨機排列選項
        });
    });

    // 呼叫一次設定按鈕佈局，以適應初始視窗大小
    setupOptionsLayout();
}

// ------------------------------------
// 1. 響應式設計的核心函數
// ------------------------------------
function windowResized() {
    // 改變畫布大小以適應新的視窗尺寸
    resizeCanvas(windowWidth, windowHeight);
    // 重新計算按鈕的佈局和大小
    setupOptionsLayout();
}

// 計算比例並設定按鈕佈局
function setupOptionsLayout() {
    // 使用當前畫布寬度和基準寬度的比例來調整尺寸
    let scaleFactor = width / BASE_WIDTH; 
    
    optionButtons = [];
    
    // 讓所有元素的位置和大小都乘以比例因子
    let buttonWidth = 400 * scaleFactor;
    let buttonHeight = 50 * scaleFactor;
    let spacing = 20 * scaleFactor;
    
    let startY = height / 2 + 50 * scaleFactor;
    let startX = width / 2 - buttonWidth / 2;

    for (let i = 0; i < 3; i++) {
        let y = startY + (buttonHeight + spacing) * i;
        optionButtons.push({
            x: startX,
            y: y,
            w: buttonWidth,
            h: buttonHeight
        });
    }
}

// ------------------------------------
// Draw 函數
// ------------------------------------
function draw() {
    background(240, 240, 255); 
    
    drawCustomCursor();

    if (quizState === 'QUIZ') {
        drawQuizScreen();
    } else if (quizState === 'RESULT') {
        drawResultScreen();
    }
}

function drawQuizScreen() {
    if (currentQuestionIndex >= questions.length) {
        calculateResult();
        return;
    }

    let q = questions[currentQuestionIndex];
    let scaleFactor = width / BASE_WIDTH; 

    // 調整文字大小
    fill(50);
    textSize(24 * scaleFactor); // 比例調整文字大小
    text(`第 ${currentQuestionIndex + 1} 題 / 共 ${questions.length} 題`, width / 2, 80 * scaleFactor);
    textSize(28 * scaleFactor); // 比例調整題目文字大小
    text(q.question, width / 2, height / 2 - 50 * scaleFactor);

    // 繪製選項
    textSize(20 * scaleFactor); 
    
    for (let i = 0; i < optionButtons.length; i++) {
        let btn = optionButtons[i];
        // 🚨 2. 使用隨機排列好的選項文字
        let optionText = q.shuffledOptions[i]; 
        
        let isHover = mouseX > btn.x && mouseX < btn.x + btn.w &&
                      mouseY > btn.y && mouseY < btn.y + btn.h;
        
        // 選項選取時的特效 (高亮)
        if (isHover) {
            fill(150, 200, 255); // 懸停顏色
        } else {
            fill(200, 220, 255); // 預設顏色
        }
        
        // 繪製選項框
        rect(btn.x, btn.y, btn.w, btn.h, 10 * scaleFactor); // 圓角也隨比例調整
        
        // 繪製選項文字
        fill(50);
        text(optionText, btn.x + btn.w / 2, btn.y + btn.h / 2);
    }
}

// ------------------------------------
// 處理點擊作答
// ------------------------------------
function mousePressed() {
    if (quizState === 'QUIZ') {
        let q = questions[currentQuestionIndex];
        
        for (let i = 0; i < optionButtons.length; i++) {
            let btn = optionButtons[i];
            
            if (mouseX > btn.x && mouseX < btn.x + btn.w &&
                mouseY > btn.y && mouseY < btn.y + btn.h) {
                
                // 🚨 檢查答案：使用當前隨機排列的選項
                let selectedAnswer = q.shuffledOptions[i]; 
                
                if (selectedAnswer === q.correct) {
                    score++;
                }
                
                // 進入下一題前，為下一題重新洗牌選項
                currentQuestionIndex++;
                if (currentQuestionIndex < questions.length) {
                    questions[currentQuestionIndex].shuffledOptions = shuffle(questions[currentQuestionIndex].allOptions);
                }

                break;
            }
        }
    } 
    // ... (RESULT 狀態的邏輯不變)
}

// ------------------------------------
// 游標與結果動畫 (保持不變，但建議將所有尺寸參數乘以 scaleFactor)
// ------------------------------------

function drawCustomCursor() {
    // 由於篇幅限制，這裡不顯示 Particle 類別的完整程式碼，
    // 但您應該確保其中的尺寸和速度也考慮到 scaleFactor
    if (frameCount % 3 === 0) {
        cursorParticles.push(new Particle(mouseX, mouseY));
    }
    
    for (let i = cursorParticles.length - 1; i >= 0; i--) {
        cursorParticles[i].update();
        cursorParticles[i].display();
        if (cursorParticles[i].isFinished()) {
            cursorParticles.splice(i, 1);
        }
    }
    
    let scaleFactor = width / BASE_WIDTH; 
    fill(255, 0, 100);
    ellipse(mouseX, mouseY, 8 * scaleFactor, 8 * scaleFactor); // 游標中心點也隨比例調整
}

// Particle Class (簡化版本，建議在實際專案中將尺寸參數乘以 scaleFactor)
class Particle {
    constructor(x, y) {
        let scaleFactor = width / BASE_WIDTH;
        this.position = createVector(x, y);
        this.velocity = p5.Vector.random2D();
        this.velocity.mult(random(0.5, 2) * scaleFactor * 0.5); // 速度也調整
        this.lifespan = 255;
        this.color = color(random(150, 255), random(100, 200), 255, this.lifespan); 
        this.size = random(3, 6) * scaleFactor;
    }

    update() {
        this.position.add(this.velocity);
        this.lifespan -= 5;
        this.color.setAlpha(this.lifespan);
        this.size *= 0.98;
    }

    display() {
        fill(this.color);
        ellipse(this.position.x, this.position.y, this.size, this.size);
    }

    isFinished() {
        return this.lifespan < 0;
    }
}

// ------------------------------------
// 結果畫面與動畫
// ------------------------------------
function calculateResult() {
    quizState = 'RESULT';
    resultAnimationTimer = 0; // 重置計時器
    effectParticles = [];     // 清空舊的粒子

    let percentage = (score / questions.length) * 100;

    if (percentage === 100) {
        resultMessage = "太棒了，全部答對！";
        resultEffectType = 'PERFECT'; // 滿分 -> 星星
        encouragementText = "";
    } else if (percentage >= 70) {
        resultMessage = "表現優異！";
        resultEffectType = 'GOOD'; // 優秀 -> 彩帶
        encouragementText = "離滿分只差一步了！";
    } else if (percentage >= 40) {
        resultMessage = "還不錯，繼續努力！";
        resultEffectType = 'OKAY'; // 及格 -> 泡泡
        encouragementText = "知識就是力量，加油！";
    } else {
        resultMessage = "別灰心，再試一次！";
        resultEffectType = 'LOW'; // 待加強 -> 下雨
        encouragementText = "失敗為成功之母！";
    }
}

function drawResultScreen() {
    resultAnimationTimer++;
    let scaleFactor = width / BASE_WIDTH;

    // 顯示分數
    fill(50);
    textSize(36 * scaleFactor);
    text(resultMessage, width / 2, height / 3);
    textSize(48 * scaleFactor);
    text(`您的分數: ${score} / ${questions.length}`, width / 2, height / 2);

    // 顯示鼓勵文字
    if (encouragementText) {
        textSize(30 * scaleFactor);
        let bounceY = sin(frameCount * 0.1) * 10 * scaleFactor;
        fill(0, 150, 255);
        text(encouragementText, width / 2, height * 0.7 + bounceY);
    }

    // --- 根據分數等級產生並繪製不同的特效 ---
    switch (resultEffectType) {
        case 'PERFECT': // 滿分：星星
            // 每隔一段時間，在畫面底部隨機位置發射一枚煙火
            if (frameCount % 60 === 0) {
                effectParticles.push(new Firework());
            }
            break;
        case 'GOOD': // 優秀：彩帶
            if (frameCount % 2 === 0) {
                effectParticles.push(new ConfettiParticle(random(width), -20));
            }
            break;
        case 'OKAY': // 及格：泡泡
            if (frameCount % 15 === 0) {
                effectParticles.push(new BubbleParticle(random(width), height + 20));
            }
            break;
        case 'LOW': // 待加強：下雨
            if (frameCount % 2 === 0) {
                effectParticles.push(new RainParticle(random(width), -20));
            }
            break;
    }

    // 更新和繪製所有粒子
    for (let i = effectParticles.length - 1; i >= 0; i--) {
        effectParticles[i].update();
        effectParticles[i].display();
        if (effectParticles[i].isFinished()) {
            effectParticles.splice(i, 1);
        }
    }
}

// ====================================
//      新的特效粒子類別
// ====================================

// 煙火主體類別 (管理發射與爆炸)
class Firework {
    constructor() {
        let scaleFactor = width / BASE_WIDTH;
        // 煙火的顏色
        this.color = random(confettiColors);
        // 發射物 (也是一個粒子)
        this.rocket = new FireworkParticle(random(width), height, this.color, true, scaleFactor);
        this.exploded = false;
        this.explosion = [];
    }

    update() {
        if (!this.exploded) {
            this.rocket.update();
            // 當發射物速度變慢 (到達頂點) 時，就爆炸
            if (this.rocket.velocity.y >= 0) {
                this.exploded = true;
                this.explode();
            }
        }

        for (let i = this.explosion.length - 1; i >= 0; i--) {
            this.explosion[i].update();
            if (this.explosion[i].isFinished()) {
                this.explosion.splice(i, 1);
            }
        }
    }

    explode() {
        let scaleFactor = width / BASE_WIDTH;
        let explosionPos = this.rocket.position;
        // 爆炸產生 100 個小火花
        for (let i = 0; i < 100; i++) {
            this.explosion.push(new FireworkParticle(explosionPos.x, explosionPos.y, this.color, false, scaleFactor));
        }
    }

    display() {
        if (!this.exploded) {
            this.rocket.display();
        }
        for (let particle of this.explosion) {
            particle.display();
        }
    }

    isFinished() {
        // 當煙火已爆炸且所有火花都消失時，這個煙火物件才算完成
        return this.exploded && this.explosion.length === 0;
    }
}



// 彩帶粒子
class ConfettiParticle {
    constructor(x, y) {
        let scaleFactor = width / BASE_WIDTH;
        this.position = createVector(x, y);
        this.velocity = createVector(random(-1, 1) * scaleFactor, random(1, 3) * scaleFactor);
        this.size = createVector(random(5, 10) * scaleFactor, random(10, 20) * scaleFactor);
        this.color = random(confettiColors);
        this.angle = random(TWO_PI);
        this.rotationSpeed = random(-0.1, 0.1);
        this.lifespan = 255;
    }
    update() {
        this.position.add(this.velocity);
        this.angle += this.rotationSpeed;
        this.lifespan -= 2;
    }
    display() {
        push();
        translate(this.position.x, this.position.y);
        rotate(this.angle);
        fill(this.color);
        noStroke();
        rect(0, 0, this.size.x, this.size.y);
        pop();
    }
    isFinished() {
        return this.lifespan < 0 || this.position.y > height + 20;
    }
}

// 泡泡粒子
class BubbleParticle {
    constructor(x, y) {
        let scaleFactor = width / BASE_WIDTH;
        this.position = createVector(x, y);
        this.velocity = createVector(sin(frameCount * 0.1 + x) * 0.5, -random(1, 3) * scaleFactor);
        this.size = random(10, 40) * scaleFactor;
        this.lifespan = 255;
    }
    update() {
        this.position.add(this.velocity);
        this.lifespan -= 1.5;
    }
    display() {
        noFill();
        stroke(255, this.lifespan);
        strokeWeight(2);
        ellipse(this.position.x, this.position.y, this.size);
    }
    isFinished() {
        return this.lifespan < 0 || this.position.y < -40;
    }
}

// 下雨粒子
class RainParticle {
    constructor(x, y) {
        let scaleFactor = width / BASE_WIDTH;
        this.position = createVector(x, y);
        this.velocity = createVector(0, random(8, 15) * scaleFactor);
        this.len = random(10, 20) * scaleFactor;
    }
    update() {
        this.position.add(this.velocity);
    }
    display() {
        stroke(138, 180, 248, 150); // 藍色
        strokeWeight(2);
        line(this.position.x, this.position.y, this.position.x, this.position.y + this.len);
    }
    isFinished() {
        return this.position.y > height;
    }
}

// 煙火粒子類別 (用於發射物與爆炸後的火花)
const gravity = new p5.Vector(0, 0.2); // 模擬重力

class FireworkParticle {
    constructor(x, y, color, isRocket, scaleFactor) {
        this.position = createVector(x, y);
        this.isRocket = isRocket;
        this.color = color;
        this.lifespan = 255;
        this.size = random(2, 4) * scaleFactor;

        if (this.isRocket) {
            // 發射物：垂直向上發射
            this.velocity = createVector(0, -random(12, 16) * scaleFactor);
        } else {
            // 爆炸火花：向四面八方炸開
            this.velocity = p5.Vector.random2D().mult(random(1, 6) * scaleFactor);
        }
    }

    update() {
        // 所有粒子都受重力影響
        this.velocity.add(gravity);
        this.position.add(this.velocity);
        
        // 火花會慢慢消失
        if (!this.isRocket) {
            this.lifespan -= 4;
        }
    }

    display() {
        let c = color(this.color);
        c.setAlpha(this.lifespan);
        fill(c);
        noStroke();
        ellipse(this.position.x, this.position.y, this.size);
    }

    isFinished() {
        return this.lifespan < 0;
    }
}

// 由於 StarParticle 和 star() 函數不再被使用，您可以選擇性地將它們刪除
// 為了保持 diff 簡潔，這裡僅註解說明