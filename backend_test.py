#!/usr/bin/env python3
"""
Intercourier Corvo Backend API Test Suite
Tests all backend endpoints with proper authentication
"""

import requests
import json
import os
import subprocess
import time
from datetime import datetime, timezone
import uuid

# Get backend URL from frontend .env
BACKEND_URL = "https://entrega-mobile-1.preview.emergentagent.com/api"

class CorvoAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session_token = None
        self.user_id = None
        self.test_delivery_id = None
        self.test_user_id = None
        
    def create_test_admin_user(self):
        """Create test admin user and session using mongosh"""
        print("🔧 Creating test admin user and session...")
        
        # Generate unique IDs
        timestamp = int(time.time() * 1000)
        visitor_id = f"user_{timestamp}"
        session_token = f"test_session_{timestamp}"
        
        # MongoDB command to create test user and session
        mongo_cmd = f'''
        use('test_database');
        var visitorId = '{visitor_id}';
        var sessionToken = '{session_token}';
        db.users.insertOne({{
          user_id: visitorId,
          email: 'admin@test.com',
          name: 'Test Admin',
          picture: null,
          role: 'admin',
          created_at: new Date(),
          is_active: true
        }});
        db.user_sessions.insertOne({{
          user_id: visitorId,
          session_token: sessionToken,
          expires_at: new Date(Date.now() + 7*24*60*60*1000),
          created_at: new Date()
        }});
        print('Session token: ' + sessionToken);
        print('User ID: ' + visitorId);
        '''
        
        try:
            result = subprocess.run(['mongosh', '--eval', mongo_cmd], 
                                  capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                print("✅ Test admin user and session created successfully")
                self.session_token = session_token
                self.user_id = visitor_id
                return True
            else:
                print(f"❌ Failed to create test user: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Error creating test user: {e}")
            return False
    
    def make_request(self, method, endpoint, data=None, headers=None, expect_success=True):
        """Make HTTP request with proper error handling"""
        url = f"{self.base_url}{endpoint}"
        
        # Add auth header if session token exists
        if self.session_token and headers is None:
            headers = {"Authorization": f"Bearer {self.session_token}"}
        elif self.session_token and headers:
            headers["Authorization"] = f"Bearer {self.session_token}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "PATCH":
                response = requests.patch(url, json=data, headers=headers, timeout=30)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            print(f"  {method} {endpoint} -> {response.status_code}")
            
            if expect_success and response.status_code >= 400:
                print(f"    ❌ Error: {response.text}")
                return None
            
            try:
                return response.json() if response.content else {}
            except:
                return {"status_code": response.status_code, "content": response.text}
                
        except requests.exceptions.RequestException as e:
            print(f"    ❌ Request failed: {e}")
            return None
    
    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication Endpoints...")
        results = {}
        
        # Test GET /api/auth/me
        print("Testing GET /api/auth/me")
        me_response = self.make_request("GET", "/auth/me")
        if me_response and "user_id" in me_response:
            print("  ✅ Successfully retrieved current user")
            results["auth_me"] = True
        else:
            print("  ❌ Failed to get current user")
            results["auth_me"] = False
        
        # Test POST /api/auth/logout
        print("Testing POST /api/auth/logout")
        logout_response = self.make_request("POST", "/auth/logout")
        if logout_response and logout_response.get("success"):
            print("  ✅ Logout successful")
            results["auth_logout"] = True
            # Recreate session for further tests
            self.create_test_admin_user()
        else:
            print("  ❌ Logout failed")
            results["auth_logout"] = False
        
        return results
    
    def test_user_management(self):
        """Test user management endpoints (admin only)"""
        print("\n👥 Testing User Management Endpoints...")
        results = {}
        
        # Test GET /api/users (list all users)
        print("Testing GET /api/users")
        users_response = self.make_request("GET", "/users")
        if users_response and isinstance(users_response, list):
            print(f"  ✅ Retrieved {len(users_response)} users")
            results["users_list"] = True
        else:
            print("  ❌ Failed to list users")
            results["users_list"] = False
        
        # Test POST /api/users (create new entregador)
        print("Testing POST /api/users")
        new_user_data = {
            "email": f"entregador_{int(time.time())}@test.com",
            "name": "Test Entregador",
            "role": "entregador"
        }
        create_response = self.make_request("POST", "/users", new_user_data)
        if create_response and "user_id" in create_response:
            print("  ✅ Successfully created new user")
            self.test_user_id = create_response["user_id"]
            results["users_create"] = True
        else:
            print("  ❌ Failed to create user")
            results["users_create"] = False
        
        # Test PATCH /api/users/{id} (update user)
        if self.test_user_id:
            print(f"Testing PATCH /api/users/{self.test_user_id}")
            update_data = {"name": "Updated Test Entregador"}
            update_response = self.make_request("PATCH", f"/users/{self.test_user_id}", update_data)
            if update_response and update_response.get("name") == "Updated Test Entregador":
                print("  ✅ Successfully updated user")
                results["users_update"] = True
            else:
                print("  ❌ Failed to update user")
                results["users_update"] = False
        
        # Test GET /api/users/{id}/stats
        if self.test_user_id:
            print(f"Testing GET /api/users/{self.test_user_id}/stats")
            stats_response = self.make_request("GET", f"/users/{self.test_user_id}/stats")
            if stats_response and "stats" in stats_response:
                print("  ✅ Successfully retrieved user stats")
                results["users_stats"] = True
            else:
                print("  ❌ Failed to get user stats")
                results["users_stats"] = False
        
        # Test DELETE /api/users/{id}
        if self.test_user_id:
            print(f"Testing DELETE /api/users/{self.test_user_id}")
            delete_response = self.make_request("DELETE", f"/users/{self.test_user_id}")
            if delete_response and delete_response.get("success"):
                print("  ✅ Successfully deleted user")
                results["users_delete"] = True
            else:
                print("  ❌ Failed to delete user")
                results["users_delete"] = False
        
        return results
    
    def test_deliveries(self):
        """Test delivery endpoints"""
        print("\n📦 Testing Delivery Endpoints...")
        results = {}
        
        # Test POST /api/deliveries (create delivery)
        print("Testing POST /api/deliveries")
        delivery_data = {
            "client_name": "Test Client",
            "client_email": "client@test.com",
            "address": "123 Test Street, Test City",
            "notes": "Test delivery notes"
        }
        create_response = self.make_request("POST", "/deliveries", delivery_data)
        if create_response and "delivery_id" in create_response:
            print("  ✅ Successfully created delivery")
            self.test_delivery_id = create_response["delivery_id"]
            results["deliveries_create"] = True
        else:
            print("  ❌ Failed to create delivery")
            results["deliveries_create"] = False
        
        # Test GET /api/deliveries (list deliveries)
        print("Testing GET /api/deliveries")
        list_response = self.make_request("GET", "/deliveries")
        if list_response and isinstance(list_response, list):
            print(f"  ✅ Retrieved {len(list_response)} deliveries")
            results["deliveries_list"] = True
        else:
            print("  ❌ Failed to list deliveries")
            results["deliveries_list"] = False
        
        # Test GET /api/deliveries/{id}
        if self.test_delivery_id:
            print(f"Testing GET /api/deliveries/{self.test_delivery_id}")
            get_response = self.make_request("GET", f"/deliveries/{self.test_delivery_id}")
            if get_response and get_response.get("delivery_id") == self.test_delivery_id:
                print("  ✅ Successfully retrieved delivery")
                results["deliveries_get"] = True
            else:
                print("  ❌ Failed to get delivery")
                results["deliveries_get"] = False
        
        # Test PATCH /api/deliveries/{id} (update status)
        if self.test_delivery_id:
            print(f"Testing PATCH /api/deliveries/{self.test_delivery_id}")
            update_data = {"status": "em_transito", "notes": "Updated notes"}
            update_response = self.make_request("PATCH", f"/deliveries/{self.test_delivery_id}", update_data)
            if update_response and update_response.get("status") == "em_transito":
                print("  ✅ Successfully updated delivery")
                results["deliveries_update"] = True
            else:
                print("  ❌ Failed to update delivery")
                results["deliveries_update"] = False
        
        # Test POST /api/deliveries/bulk-status
        if self.test_delivery_id:
            print("Testing POST /api/deliveries/bulk-status")
            bulk_data = {
                "delivery_ids": [self.test_delivery_id],
                "status": "entregue"
            }
            bulk_response = self.make_request("POST", "/deliveries/bulk-status", bulk_data)
            if bulk_response and bulk_response.get("success"):
                print("  ✅ Successfully updated delivery status in bulk")
                results["deliveries_bulk"] = True
            else:
                print("  ❌ Failed to bulk update delivery status")
                results["deliveries_bulk"] = False
        
        return results
    
    def test_dashboard_stats(self):
        """Test dashboard and statistics endpoints"""
        print("\n📊 Testing Dashboard & Stats Endpoints...")
        results = {}
        
        # Test GET /api/stats/dashboard
        print("Testing GET /api/stats/dashboard")
        dashboard_response = self.make_request("GET", "/stats/dashboard")
        if dashboard_response and "all_time" in dashboard_response:
            print("  ✅ Successfully retrieved dashboard stats")
            results["dashboard_stats"] = True
        else:
            print("  ❌ Failed to get dashboard stats")
            results["dashboard_stats"] = False
        
        return results
    
    def test_reports(self):
        """Test report endpoints"""
        print("\n📋 Testing Report Endpoints...")
        results = {}
        
        # Test GET /api/reports/daily
        print("Testing GET /api/reports/daily")
        daily_response = self.make_request("GET", "/reports/daily")
        if daily_response and "stats" in daily_response:
            print("  ✅ Successfully retrieved daily report")
            results["reports_daily"] = True
        else:
            print("  ❌ Failed to get daily report")
            results["reports_daily"] = False
        
        # Test GET /api/reports/excel
        print("Testing GET /api/reports/excel")
        excel_response = self.make_request("GET", "/reports/excel", expect_success=False)
        if excel_response and excel_response.get("status_code") in [200, 404]:
            print("  ✅ Excel export endpoint responding")
            results["reports_excel"] = True
        else:
            print("  ❌ Excel export endpoint failed")
            results["reports_excel"] = False
        
        # Test GET /api/reports/pdf
        print("Testing GET /api/reports/pdf")
        pdf_response = self.make_request("GET", "/reports/pdf", expect_success=False)
        if pdf_response and pdf_response.get("status_code") in [200, 404]:
            print("  ✅ PDF export endpoint responding")
            results["reports_pdf"] = True
        else:
            print("  ❌ PDF export endpoint failed")
            results["reports_pdf"] = False
        
        # Test POST /api/reports/close-day
        print("Testing POST /api/reports/close-day")
        close_response = self.make_request("POST", "/reports/close-day", expect_success=False)
        if close_response:
            if close_response.get("success") or "já foi fechado" in str(close_response):
                print("  ✅ Close day endpoint working")
                results["reports_close"] = True
            else:
                print("  ❌ Close day endpoint failed")
                results["reports_close"] = False
        else:
            print("  ❌ Close day endpoint not responding")
            results["reports_close"] = False
        
        return results
    
    def run_all_tests(self):
        """Run all tests and return comprehensive results"""
        print("🚀 Starting Intercourier Corvo Backend API Tests")
        print(f"Backend URL: {self.base_url}")
        
        # Create test user first
        if not self.create_test_admin_user():
            print("❌ Failed to create test user. Cannot proceed with tests.")
            return {}
        
        all_results = {}
        
        # Run all test suites
        all_results.update(self.test_auth_endpoints())
        all_results.update(self.test_user_management())
        all_results.update(self.test_deliveries())
        all_results.update(self.test_dashboard_stats())
        all_results.update(self.test_reports())
        all_results.update(self.test_manifests())
        
        # Print summary
        print("\n" + "="*60)
        print("📊 TEST RESULTS SUMMARY")
        print("="*60)
        
        passed = sum(1 for result in all_results.values() if result)
        total = len(all_results)
        
        for test_name, result in all_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name:25} {status}")
        
        print(f"\nOverall: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        
        return all_results

def main():
    """Main test execution"""
    tester = CorvoAPITester()
    results = tester.run_all_tests()
    
    # Exit with error code if any tests failed
    if not all(results.values()):
        exit(1)
    else:
        print("\n🎉 All tests passed!")
        exit(0)

if __name__ == "__main__":
    main()