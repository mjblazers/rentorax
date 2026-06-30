# RentoraX Auth Testing Playbook

## Auth endpoints
- POST /api/auth/login {email, password}
- POST /api/auth/logout
- GET  /api/auth/me
- POST /api/auth/change-password {current_password, new_password}

## Admin credentials
- email: admin@rentorax.com
- password: Admin@2026

## Curl quick check
```
curl -c /tmp/cookies.txt -X POST "$URL/api/auth/login" -H "Content-Type: application/json" \
     -d '{"email":"admin@rentorax.com","password":"Admin@2026"}'
curl -b /tmp/cookies.txt "$URL/api/auth/me"
```

## MongoDB checks
```
db.users.findOne({email:"admin@rentorax.com"}, {password_hash: 1, role: 1})
```
Hash must start with `$2b$` and role must be `super_admin`.
