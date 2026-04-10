## Prompt 3 - Change

```
Implement user registration and login:
- POST /users/register — { email, username, password }
- POST /users/login — { email, password } → { token }

Requirements:
- Hash passwords (never store plaintext)
- JWT secret must come from an environment variable
- Do not return the password hash in any response
- Write tests for both endpoints — happy path and at least one error case each
- If you need to mock data, please put it in a separate file under `folder_name/__mock__` and use the convention `<fileName>MockData.ts` 
- Keep the Hono documentation (./hono_full_docs.txt) always in sync with your implementation
```

---