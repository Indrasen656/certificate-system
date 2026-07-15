const http = require('http');

const PORT = 5000;
const HOST = 'localhost';

// Helper function to make HTTP requests
const makeRequest = (options, postData = null) => {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: body ? JSON.parse(body) : null
                });
            });
        });

        req.on('error', (e) => reject(e));

        if (postData) {
            req.write(JSON.stringify(postData));
        }
        req.end();
    });
};

// Helper for buffer-based HTTP request (used for PDF download validation)
const makeBufferRequest = (options) => {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: Buffer.concat(chunks)
                });
            });
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
};

const runTests = async () => {
    console.log('🚀 Starting API Integration Flow Test...');
    let token = '';
    let certificateId = '';
    let verificationId = '';

    try {
        // 1. Authenticate Admin User
        console.log('\nStep 1: Authenticating Admin User...');
        const loginRes = await makeRequest({
            hostname: HOST,
            port: PORT,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, {
            email: 'admin@example.com',
            password: 'password123'
        });

        if (loginRes.statusCode !== 200) {
            throw new Error(`Login failed with status ${loginRes.statusCode}: ${JSON.stringify(loginRes.data)}`);
        }

        token = loginRes.data.token;
        console.log('✅ Authenticated successfully! Token obtained.');

        // 2. Issue a New Certificate
        console.log('\nStep 2: Issuing a New Certificate...');
        const issueRes = await makeRequest({
            hostname: HOST,
            port: PORT,
            path: '/api/certificates',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        }, {
            studentName: 'John Doe Test',
            studentEmail: 'student@test.com',
            rollNumber: 'CS101',
            course: 'Advanced Automation Testing',
            issueDate: new Date().toISOString()
        });

        if (issueRes.statusCode !== 201) {
            throw new Error(`Issuance failed with status ${issueRes.statusCode}: ${JSON.stringify(issueRes.data)}`);
        }

        certificateId = issueRes.data.certificate._id;
        verificationId = issueRes.data.certificate.verificationId;
        console.log(`✅ Issue Success! ID: ${certificateId}, Verification Code: ${verificationId}`);
        console.log(`✅ QR Code Data URI generated: ${issueRes.data.qrCode.substring(0, 40)}...`);

        // 3. Verify Certificate Publicly
        console.log('\nStep 3: Publicly Verifying the Certificate...');
        const verifyRes = await makeRequest({
            hostname: HOST,
            port: PORT,
            path: `/api/certificates/verify/${verificationId}`,
            method: 'GET'
        });

        if (verifyRes.statusCode !== 200 || !verifyRes.data.isValid) {
            throw new Error(`Verification failed with status ${verifyRes.statusCode}: ${JSON.stringify(verifyRes.data)}`);
        }

        console.log(`✅ Verification Success! Recipient: ${verifyRes.data.certificate.studentName}, Safe: ${verifyRes.data.isValid}`);

        // 3b. Search Certificate by Email
        console.log('\nStep 3b: Publicly Searching Certificate by Email...');
        const searchEmailRes = await makeRequest({
            hostname: HOST,
            port: PORT,
            path: `/api/certificates/search?query=student@test.com`,
            method: 'GET'
        });

        if (searchEmailRes.statusCode !== 200 || !Array.isArray(searchEmailRes.data) || searchEmailRes.data.length === 0) {
            throw new Error(`Search by email failed with status ${searchEmailRes.statusCode}: ${JSON.stringify(searchEmailRes.data)}`);
        }
        console.log(`✅ Search by Email Success! Found ${searchEmailRes.data.length} certificate(s).`);

        // 3c. Search Certificate by Roll Number
        console.log('\nStep 3c: Publicly Searching Certificate by Roll Number...');
        const searchRollRes = await makeRequest({
            hostname: HOST,
            port: PORT,
            path: `/api/certificates/search?query=CS101`,
            method: 'GET'
        });

        if (searchRollRes.statusCode !== 200 || !Array.isArray(searchRollRes.data) || searchRollRes.data.length === 0) {
            throw new Error(`Search by roll number failed with status ${searchRollRes.statusCode}: ${JSON.stringify(searchRollRes.data)}`);
        }
        console.log(`✅ Search by Roll Number Success! Found ${searchRollRes.data.length} certificate(s).`);

        // 4. Download PDF Stream
        console.log('\nStep 4: Requesting PDF Certificate Binary...');
        const pdfRes = await makeBufferRequest({
            hostname: HOST,
            port: PORT,
            path: `/api/certificates/download/${certificateId}`,
            method: 'GET'
        });

        if (pdfRes.statusCode !== 200) {
            throw new Error(`PDF download request resulted in status ${pdfRes.statusCode}`);
        }

        const isPdf = pdfRes.headers['content-type'] === 'application/pdf';
        console.log(`✅ Download Success! Content-Type: ${pdfRes.headers['content-type']}, Size: ${pdfRes.data.length} bytes. Verified PDF: ${isPdf}`);

        // 5. Clean up: Delete Certificate
        console.log('\nStep 5: Deleting Certificate (Admin Only)...');
        const deleteRes = await makeRequest({
            hostname: HOST,
            port: PORT,
            path: `/api/certificates/${certificateId}`,
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (deleteRes.statusCode !== 200) {
            throw new Error(`Deletion failed with status ${deleteRes.statusCode}: ${JSON.stringify(deleteRes.data)}`);
        }

        console.log('✅ Delete Success! Registry updated.');

        console.log('\n🎉 ALL INTEGRATION FLOW TESTS COMPLETED SUCCESSFULLY!');
        process.exit(0);

    } catch (err) {
        console.error('\n❌ TEST RUN ERROR:', err.message);
        process.exit(1);
    }
};

runTests();
