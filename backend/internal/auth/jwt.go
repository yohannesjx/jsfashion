package auth

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// Claims represents JWT claims
type Claims struct {
	UserID    int64  `json:"user_id"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	jwt.RegisteredClaims
}

var (
	jwtSecret        = []byte(getEnv("JWT_SECRET", "your-secret-key-change-this"))
	jwtRefreshSecret = []byte(getEnv("JWT_REFRESH_SECRET", "your-refresh-secret-change-this"))
)

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// GenerateAccessToken creates a new JWT access token (15 minutes)
func GenerateAccessToken(userID int64, email, role, firstName, lastName string) (string, error) {
	claims := Claims{
		UserID:    userID,
		Email:     email,
		Role:      role,
		FirstName: firstName,
		LastName:  lastName,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "luxe-admin",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// GenerateRefreshToken creates a new refresh token (7 days)
func GenerateRefreshToken(userID int64) (string, error) {
	claims := jwt.RegisteredClaims{
		Subject:   fmt.Sprintf("%d", userID),
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		Issuer:    "luxe-admin",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtRefreshSecret)
}

// ValidateAccessToken validates and parses an access token
func ValidateAccessToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}

// ValidateRefreshToken validates a refresh token and returns user ID
func ValidateRefreshToken(tokenString string) (int64, error) {
	token, err := jwt.ParseWithClaims(tokenString, &jwt.RegisteredClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtRefreshSecret, nil
	})

	if err != nil {
		return 0, err
	}

	if claims, ok := token.Claims.(*jwt.RegisteredClaims); ok && token.Valid {
		var userID int64
		fmt.Sscanf(claims.Subject, "%d", &userID)
		return userID, nil
	}

	return 0, fmt.Errorf("invalid refresh token")
}

// HashPassword hashes a password using bcrypt
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPasswordHash compares a password with a hash
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// GenerateRandomToken generates a cryptographically secure random token
func GenerateRandomToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(bytes), nil
}
