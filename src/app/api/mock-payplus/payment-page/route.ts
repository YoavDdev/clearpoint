import { NextRequest, NextResponse } from 'next/server';

/**
 * Mock PayPlus Payment Page
 * דף תשלום מזויף - מציג הודעה שזה Mock ומאפשר "לשלם"
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const id = searchParams.get('id');
  const type = searchParams.get('type') || 'one_time';
  const amount = searchParams.get('amount') || '0';
  const monthlyPrice = searchParams.get('monthly_price') || '0';

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mock PayPlus - דף תשלום</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 20px;
          padding: 40px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 48px;
          margin-bottom: 10px;
        }
        h1 {
          color: #333;
          font-size: 24px;
          margin-bottom: 10px;
        }
        .badge {
          display: inline-block;
          background: #ffd700;
          color: #333;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 20px;
        }
        .info-box {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #e0e0e0;
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .label {
          color: #666;
          font-size: 14px;
        }
        .value {
          color: #333;
          font-weight: 600;
          font-size: 14px;
        }
        .warning {
          background: #fff3cd;
          border: 2px solid #ffc107;
          border-radius: 12px;
          padding: 15px;
          margin-bottom: 20px;
          text-align: center;
        }
        .warning-icon {
          font-size: 32px;
          margin-bottom: 10px;
        }
        .warning-text {
          color: #856404;
          font-size: 14px;
          line-height: 1.5;
        }
        .btn {
          width: 100%;
          padding: 16px;
          font-size: 18px;
          font-weight: bold;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s;
          margin-bottom: 10px;
        }
        .btn-pay {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .btn-pay:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
        }
        .btn-cancel {
          background: #6c757d;
          color: white;
        }
        .btn-cancel:hover {
          background: #5a6268;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🧪</div>
          <h1>Mock PayPlus</h1>
          <span class="badge">מצב פיתוח</span>
        </div>

        <div class="warning">
          <div class="warning-icon">⚠️</div>
          <div class="warning-text">
            <strong>שים לב!</strong><br>
            זהו דף תשלום מזויף לצורך פיתוח.<br>
            לא יתבצע חיוב אמיתי.
          </div>
        </div>

        <div class="info-box">
          <div class="info-row">
            <span class="label">מזהה תשלום:</span>
            <span class="value">${id}</span>
          </div>
          <div class="info-row">
            <span class="label">סוג תשלום:</span>
            <span class="value">${
              type === 'combined' || (type === 'one_time' && monthlyPrice !== '0')
                ? '💳🔄 משולב (חד-פעמי + מנוי)'
                : type === 'recurring'
                ? '🔄 מנוי חודשי'
                : '💳 חד-פעמי'
            }</span>
          </div>
          ${
            (type === 'combined' || monthlyPrice !== '0') ? `
          <div class="info-row">
            <span class="label">תשלום עכשיו:</span>
            <span class="value" style="color: #10b981; font-weight: bold;">₪${amount}</span>
          </div>
          <div class="info-row">
            <span class="label">מחודש 2:</span>
            <span class="value" style="color: #3b82f6; font-weight: bold;">₪${monthlyPrice}/חודש</span>
          </div>
            ` : amount !== '0' ? `
          <div class="info-row">
            <span class="label">סכום:</span>
            <span class="value" style="color: #10b981; font-weight: bold;">₪${amount}</span>
          </div>
            ` : ''
          }
          <div class="info-row">
            <span class="label">סטטוס:</span>
            <span class="value">✅ Mock Mode פעיל</span>
          </div>
        </div>

        <button class="btn btn-pay" onclick="handlePay()">
          💳 בצע "תשלום" מזויף
        </button>
        
        <button class="btn btn-cancel" onclick="handleCancel()">
          ❌ ביטול
        </button>

        <div class="footer">
          Mock PayPlus API · Development Mode<br>
          Clearpoint Security © 2024
        </div>
      </div>

      <script>
        function handlePay() {
          alert('✅ תשלום מזויף בוצע בהצלחה!\\n\\nבאפליקציה אמיתית, PayPlus היה שולח Webhook למערכת.\\n\\nבמצב Mock, תצטרך לעדכן את הסטטוס ידנית ב-Database.');
          
          // במקום להפנות לדף הצלחה, נסגור את החלון או נחזור אחורה
          setTimeout(() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              window.close();
            }
          }, 2000);
        }

        function handleCancel() {
          alert('❌ התשלום בוטל');
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.close();
          }
        }
      </script>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
