const http = require('http');

const PORT = 5000;
const HOST = 'localhost';

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

const runStudentTests = async () => {
    console.log('🚀 Starting Student Auth & Dashboard API integration tests...');

    const timestamp = Date.now();
    const studentEmail = `student_${timestamp}@test.com`;
    const studentPassword = 'password123';
    const studentName = 'Test Student';

    let adminToken = '';
    let studentToken = '';
    let certId = '';

    try {
        // 1. Sign up a new student account
        console.log('\nStep 1: Registering Student Account...');
        const signupRes = await makeRequest({
            hostname: HOST,
            port: PORT,
            path: '/api/auth/register',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, {
            name: studentName,
            email: studentEmail,
            password: studentPassword,
            role: 'student'
        });

        if (signupRes.statusCode !== 201) {
            throw new Error(`Registration failed with status ${signupRes.statusCode}: ${JSON.stringify(signupRes.data)}`);
        }
        console.log('✅ Student registered successfully!');

        // 2. Log in as student
        console.log('\nStep 2: Authenticating Student...');
        const loginRes = await makeRequest({
            hostname: HOST,
            port: PORT,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, {
            email: studentEmail,
            password: studentPassword
        });

        if (loginRes.statusCode !== 200) {
            throw new Error(`Student login failed with status ${loginRes.statusCode}: ${JSON.stringify(loginRes.data)}`);
        }
        studentToken = loginRes.data.token;
        console.log(`✅ Student authenticated! Role: ${loginRes.data.user.role}, Token obtained.`);

        // 3. Authenticate as admin to issue a certificate for this student
        console.log('\nStep 3: Authenticating Admin to issue a certificate...');
        const adminLogin = await makeRequest({
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

        if (adminLogin.statusCode !== 200) {
            throw new Error(`Admin login failed: ${JSON.stringify(adminLogin.data)}`);
        }
        adminToken = adminLogin.data.token;

        // 4. Issue a certificate for the student
        console.log('\nStep 4: Admin issuing a certificate...');
        const issueRes = await makeRequest({
            hostname: HOST,
            port: PORT,
            path: '/api/certificates',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            }
        }, {
            studentName: studentName,
            studentEmail: studentEmail,
            rollNumber: `ST_${timestamp}`,
            course: 'Interactive Verification System',
            issueDate: new Date().toISOString()
        });

        if (issueRes.statusCode !== 201) {
            throw new Error(`Certificate creation failed: ${JSON.stringify(issueRes.data)}`);
        }
        certId = issueRes.data.certificate._id;
        console.log(`✅ Certificate issued for student! ID: ${certId}`);

        // 5. Fetch student certificates as the logged-in student
        console.log('\nStep 5: Fetching certificates as Student...');
        const fetchRes = await makeRequest({
            hostname: HOST,
            port: PORT,
            path: '/api/certificates/my-certificates',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${studentToken}`
            }
        });

        if (fetchRes.statusCode !== 200) {
            throw new Error(`Fetching student certificates failed: ${JSON.stringify(fetchRes.data)}`);
        }

        const certs = fetchRes.data;
        if (!Array.isArray(certs) || certs.length !== 1 || certs[0]._id !== certId) {
            throw new Error(`Certificates list did not match expected database record. Found: ${JSON.stringify(certs)}`);
        }
        console.log('✅ Student certificates returned accurately!');
        console.log(`📑 Certificate Course Title: "${certs[0].course}"`);

        // 6. Clean up - Delete test certificate as Admin
        console.log('\nStep 6: Deleting certificate (Admin cleanup)...');
        const deleteRes = await makeRequest({
            hostname: HOST,
            port: PORT,
            path: `/api/certificates/${certId}`,
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (deleteRes.statusCode !== 200) {
            throw new Error(`Deletion failed: ${JSON.stringify(deleteRes.data)}`);
        }
        console.log('✅ Clean up complete.');

        console.log('\n🎉 ALL STUDENT LOGIN & PERSONAL LOOKUP TESTS PASSED!')
        process.exit(0);

    } catch (err) {
        console.error('\n❌ STUDENT API VERIFICATION FAILURE:', err.message);
        process.exit(1);
    }
};

runStudentTests();
