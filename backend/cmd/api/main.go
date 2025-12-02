package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	_ "github.com/lib/pq"
	"github.com/luxe-fashion/backend/internal/handlers"
	"github.com/luxe-fashion/backend/internal/repository"
)

func main() {
	// Load environment variables (in production these come from env, locally we might want .env but docker handles it)
	dbHost := getEnv("DB_HOST", "localhost")
	dbUser := getEnv("DB_USER", "postgres")
	dbPass := getEnv("DB_PASSWORD", "postgres")
	dbName := getEnv("DB_NAME", "luxe_db")
	dbPort := getEnv("DB_PORT", "5432")

	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPass, dbName)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}

	// Configure connection pool
	// SetMaxOpenConns sets the maximum number of open connections to the database.
	// A value of 25 is conservative and safe for t2.micro/small instances.
	db.SetMaxOpenConns(25)

	// SetMaxIdleConns sets the maximum number of connections in the idle connection pool.
	db.SetMaxIdleConns(25)

	// SetConnMaxLifetime sets the maximum amount of time a connection may be reused.
	db.SetConnMaxLifetime(5 * time.Minute)

	defer db.Close()

	// Initialize queries
	queries := repository.New(db)
	_ = queries // Prevent unused error for now

	e := echo.New()

	// Middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())
	e.Use(middleware.Gzip())

	// Routes
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(200, map[string]string{"status": "ok"})
	})

	// Register API Routes
	handlers.RegisterRoutes(e, queries, db)

	// Start server
	e.Logger.Fatal(e.Start(":8080"))
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
