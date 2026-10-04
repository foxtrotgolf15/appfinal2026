#!/usr/bin/env python3
"""
Backend API Testing for Altitude Dive Pro
Tests the FastAPI backend endpoints to ensure proper functionality.
"""

import requests
import json
import sys
import os
from datetime import datetime

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    base_url = line.split('=', 1)[1].strip()
                    return f"{base_url}/api"
        return None
    except Exception as e:
        print(f"Error reading frontend .env: {e}")
        return None

def test_backend_health():
    """Test basic backend connectivity and health"""
    backend_url = get_backend_url()
    if not backend_url:
        print("❌ CRITICAL: Could not determine backend URL from frontend/.env")
        return False
    
    print(f"🔍 Testing backend at: {backend_url}")
    
    try:
        # Test root endpoint
        response = requests.get(f"{backend_url}/", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("message") == "Hello World":
                print("✅ Backend root endpoint working")
                return True
            else:
                print(f"❌ Unexpected response from root: {data}")
                return False
        else:
            print(f"❌ Backend root endpoint failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ CRITICAL: Backend connection failed: {e}")
        return False

def test_status_endpoints():
    """Test status check CRUD operations"""
    backend_url = get_backend_url()
    if not backend_url:
        return False
    
    print("\n🔍 Testing Status Check APIs...")
    
    try:
        # Test GET /status (should work even if empty)
        response = requests.get(f"{backend_url}/status", timeout=10)
        if response.status_code == 200:
            print("✅ GET /status endpoint working")
            initial_count = len(response.json())
            print(f"   Initial status checks count: {initial_count}")
        else:
            print(f"❌ GET /status failed: {response.status_code}")
            return False
        
        # Test POST /status
        test_data = {
            "client_name": "test_client_backend_verification"
        }
        
        response = requests.post(
            f"{backend_url}/status", 
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            created_status = response.json()
            print("✅ POST /status endpoint working")
            print(f"   Created status check ID: {created_status.get('id')}")
            print(f"   Client name: {created_status.get('client_name')}")
            print(f"   Timestamp: {created_status.get('timestamp')}")
            
            # Verify the created record has required fields
            if all(key in created_status for key in ['id', 'client_name', 'timestamp']):
                print("✅ Status check record has all required fields")
            else:
                print("❌ Status check record missing required fields")
                return False
                
        else:
            print(f"❌ POST /status failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
        
        # Test GET /status again to verify record was saved
        response = requests.get(f"{backend_url}/status", timeout=10)
        if response.status_code == 200:
            final_count = len(response.json())
            if final_count > initial_count:
                print("✅ Status check successfully persisted to database")
                return True
            else:
                print("❌ Status check not found in database after creation")
                return False
        else:
            print(f"❌ GET /status verification failed: {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Status endpoint test failed: {e}")
        return False

def test_cors_headers():
    """Test CORS configuration"""
    backend_url = get_backend_url()
    if not backend_url:
        return False
    
    print("\n🔍 Testing CORS configuration...")
    
    try:
        response = requests.options(f"{backend_url}/", timeout=10)
        headers = response.headers
        
        # Check for CORS headers
        cors_headers = [
            'Access-Control-Allow-Origin',
            'Access-Control-Allow-Methods', 
            'Access-Control-Allow-Headers'
        ]
        
        cors_working = True
        for header in cors_headers:
            if header in headers:
                print(f"✅ {header}: {headers[header]}")
            else:
                print(f"⚠️  {header}: Not present")
                cors_working = False
        
        return cors_working
        
    except requests.exceptions.RequestException as e:
        print(f"❌ CORS test failed: {e}")
        return False

def main():
    """Run all backend tests"""
    print("=" * 60)
    print("🚀 BACKEND API TESTING - Altitude Dive Pro")
    print("=" * 60)
    
    all_tests_passed = True
    
    # Test 1: Backend Health
    if not test_backend_health():
        all_tests_passed = False
    
    # Test 2: Status Endpoints
    if not test_status_endpoints():
        all_tests_passed = False
    
    # Test 3: CORS Configuration
    if not test_cors_headers():
        all_tests_passed = False
    
    print("\n" + "=" * 60)
    if all_tests_passed:
        print("✅ ALL BACKEND TESTS PASSED")
        print("🎉 Backend is fully functional and ready for frontend integration")
    else:
        print("❌ SOME BACKEND TESTS FAILED")
        print("🔧 Backend issues need to be resolved before frontend can work properly")
    print("=" * 60)
    
    return all_tests_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)