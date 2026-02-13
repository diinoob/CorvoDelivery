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
            "password": "test123",  # Added missing password field
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
    
    def test_delivery_assignment(self):
        """Test delivery assignment endpoints specifically requested"""
        print("\n🎯 Testing Delivery Assignment Endpoints...")
        results = {}
        
        # First ensure we have admin authentication
        if not self.test_password_login():
            print("  ❌ Cannot test delivery assignments without admin authentication")
            return {"assignment_auth": False}
        
        # Step 1: Create entregador user as requested
        print("Step 1: Creating test entregador user")
        entregador_data = {
            "email": "entregador1",
            "name": "João Entregador", 
            "password": "test123",
            "role": "entregador"
        }
        
        create_entregador_response = self.make_request("POST", "/users", entregador_data, expect_success=False)
        entregador_id = None
        
        if create_entregador_response and create_entregador_response.get("user_id"):
            print("  ✅ Test entregador created successfully")
            entregador_id = create_entregador_response["user_id"]
            results["create_entregador"] = True
        elif create_entregador_response and ("já existe" in str(create_entregador_response) or "já registado" in str(create_entregador_response)):
            print("  ℹ️  Entregador user already exists, getting existing user...")
            # Try to find existing entregador by listing users
            users_response = self.make_request("GET", "/users")
            if users_response:
                for user in users_response:
                    if user.get("email") == "entregador1":
                        entregador_id = user.get("user_id")
                        print(f"  ✅ Found existing entregador with ID: {entregador_id}")
                        results["create_entregador"] = True
                        break
        
        if not entregador_id:
            print("  ❌ Failed to create or find entregador user")
            results["create_entregador"] = False
            return results
        
        # Step 2: Create test deliveries to assign
        print("Step 2: Creating test deliveries for assignment")
        test_delivery_ids = []
        
        for i in range(2):
            delivery_data = {
                "client_name": f"Test Client {i+1}",
                "address": f"{i+100} Assignment Test Street, Test City",
                "notes": f"Test delivery {i+1} for assignment"
            }
            
            delivery_response = self.make_request("POST", "/deliveries", delivery_data)
            if delivery_response and delivery_response.get("delivery_id"):
                test_delivery_ids.append(delivery_response["delivery_id"])
        
        if len(test_delivery_ids) < 1:
            print("  ❌ Failed to create test deliveries")
            results["create_test_deliveries"] = False
            return results
        
        print(f"  ✅ Created {len(test_delivery_ids)} test deliveries")
        results["create_test_deliveries"] = True
        
        # Step 3: Test GET /api/entregadores
        print("Step 3: Testing GET /api/entregadores")
        entregadores_response = self.make_request("GET", "/entregadores")
        if entregadores_response and isinstance(entregadores_response, list):
            print(f"  ✅ Retrieved {len(entregadores_response)} active entregadores")
            
            # Check if our entregador is in the list with stats
            found_entregador = None
            for ent in entregadores_response:
                if ent.get("user_id") == entregador_id:
                    found_entregador = ent
                    break
            
            if found_entregador:
                print(f"    Found entregador: {found_entregador.get('name')}")
                print(f"    Pending deliveries: {found_entregador.get('pending_deliveries', 0)}")
                print(f"    In transit deliveries: {found_entregador.get('in_transit_deliveries', 0)}")
                results["list_entregadores"] = True
            else:
                print(f"  ⚠️  Entregador {entregador_id} not found in active entregadores list")
                results["list_entregadores"] = False
        else:
            print("  ❌ Failed to list active entregadores")
            results["list_entregadores"] = False
        
        # Step 4: Test GET /api/deliveries/unassigned
        print("Step 4: Testing GET /api/deliveries/unassigned")
        unassigned_response = self.make_request("GET", "/deliveries/unassigned")
        if unassigned_response and isinstance(unassigned_response, list):
            print(f"  ✅ Retrieved {len(unassigned_response)} unassigned deliveries")
            
            # Check if our test deliveries are in the unassigned list
            found_deliveries = [d for d in unassigned_response if d.get("delivery_id") in test_delivery_ids]
            print(f"    Found {len(found_deliveries)} of our test deliveries in unassigned list")
            results["list_unassigned"] = True
        else:
            print("  ❌ Failed to list unassigned deliveries")
            results["list_unassigned"] = False
        
        # Step 5: Test POST /api/deliveries/assign
        print("Step 5: Testing POST /api/deliveries/assign")
        assignment_data = {
            "delivery_ids": test_delivery_ids[:1],  # Assign just one delivery
            "entregador_id": entregador_id
        }
        
        assign_response = self.make_request("POST", "/deliveries/assign", assignment_data)
        if assign_response and assign_response.get("success"):
            print(f"  ✅ Successfully assigned {assign_response.get('updated_count', 0)} deliveries")
            print(f"    Assigned to: {assign_response.get('entregador_name')}")
            results["assign_deliveries"] = True
        else:
            print("  ❌ Failed to assign deliveries")
            print(f"    Response: {assign_response}")
            results["assign_deliveries"] = False
        
        # Step 6: Verify assignment by checking delivery details
        print("Step 6: Verifying assignment in delivery records")
        if test_delivery_ids:
            verify_response = self.make_request("GET", f"/deliveries/{test_delivery_ids[0]}")
            if verify_response:
                assigned_entregador_id = verify_response.get("entregador_id")
                assigned_entregador_name = verify_response.get("entregador_name")
                
                if assigned_entregador_id == entregador_id:
                    print(f"  ✅ Delivery correctly assigned to {assigned_entregador_name}")
                    results["verify_assignment"] = True
                else:
                    print(f"  ❌ Assignment verification failed. Expected {entregador_id}, got {assigned_entregador_id}")
                    results["verify_assignment"] = False
            else:
                print("  ❌ Failed to retrieve delivery for verification")
                results["verify_assignment"] = False
        
        # Step 7: Test entregadores endpoint again to see updated stats
        print("Step 7: Checking updated entregador stats after assignment")
        entregadores_after = self.make_request("GET", "/entregadores")
        if entregadores_after and isinstance(entregadores_after, list):
            for ent in entregadores_after:
                if ent.get("user_id") == entregador_id:
                    print(f"  Updated stats for {ent.get('name')}:")
                    print(f"    Pending deliveries: {ent.get('pending_deliveries', 0)}")
                    print(f"    In transit deliveries: {ent.get('in_transit_deliveries', 0)}")
                    results["updated_stats"] = True
                    break
            else:
                results["updated_stats"] = False
        else:
            results["updated_stats"] = False
        
        return results
    
    def test_password_login(self):
        """Test password-based login with admin/admin"""
        print("\n🔐 Testing Password Login...")
        
        # First, we need to authenticate via session to create the admin user if it doesn't exist
        if not self.session_token:
            print("  Need to authenticate first to create admin user...")
            if not self.create_test_admin_user():
                print("  ❌ Cannot authenticate to set up admin user")
                return False
        
        # Create admin user with password using existing session
        print("Creating admin user with password...")
        admin_user_data = {
            "email": "admin",
            "name": "Administrator",
            "password": "admin",
            "role": "admin"
        }
        
        # Try to create admin user (might fail if already exists, that's OK)
        create_response = self.make_request("POST", "/users", admin_user_data, expect_success=False)
        if create_response and create_response.get("user_id"):
            print("  ✅ Admin user created successfully")
        elif create_response and "já existe" in str(create_response):
            print("  ℹ️  Admin user already exists")
        else:
            print("  ⚠️  Admin user creation response:", create_response)
        
        # Clear session token to test password login
        self.session_token = None
        
        # Test login with admin credentials
        login_data = {
            "email": "admin",
            "password": "admin"
        }
        
        print("Testing POST /api/auth/login with admin/admin")
        response = self.make_request("POST", "/auth/login", login_data, headers={}, expect_success=False)
        
        if response and response.get("session_token"):
            print("  ✅ Successfully logged in with admin/admin")
            self.session_token = response["session_token"]
            if "user_id" in response:
                self.user_id = response["user_id"]
            return True
        else:
            print("  ❌ Failed to login with admin/admin credentials")
            print(f"    Response: {response}")
            return False
    
    def test_manifests(self):
        """Test manifest processing endpoints"""
        print("\n📋 Testing Manifest Processing Endpoints...")
        results = {}
        
        # Try password login first
        if not self.test_password_login():
            print("  ❌ Cannot test manifests without authentication")
            return {"manifests_auth": False}
        
        # Test manifest data
        manifest_data = {
            "route_id": "ROTA-TEST-001",
            "date": "2026-02-13",
            "location": "Armazém Central",
            "entries": [
                {
                    "tracking_code": "1Z999AA10123456784",
                    "customer_name": "Maria Silva",
                    "address": "Rua Principal, 123",
                    "postal_code": "4000-001",
                    "city": "Porto"
                },
                {
                    "tracking_code": "1Z999AA10123456785",
                    "customer_name": "João Santos",
                    "address": "Avenida da Liberdade, 456",
                    "postal_code": "1000-001",
                    "city": "Lisboa"
                }
            ]
        }
        
        # Test POST /api/manifests (create manifest)
        print("Testing POST /api/manifests")
        create_response = self.make_request("POST", "/manifests", manifest_data)
        manifest_id = None
        if create_response and create_response.get("success") and create_response.get("manifest_id"):
            print("  ✅ Manifest created successfully")
            manifest_id = create_response["manifest_id"]
            results["create_manifest"] = True
            print(f"    Manifest ID: {manifest_id}")
            print(f"    Deliveries created: {create_response.get('deliveries_created', 0)}")
        else:
            print("  ❌ Failed to create manifest")
            results["create_manifest"] = False
        
        # Test GET /api/manifests (list manifests)
        print("Testing GET /api/manifests")
        list_response = self.make_request("GET", "/manifests")
        if list_response and isinstance(list_response, list) and len(list_response) > 0:
            print(f"  ✅ Successfully retrieved {len(list_response)} manifests")
            results["list_manifests"] = True
        else:
            print("  ❌ Failed to list manifests")
            results["list_manifests"] = False
        
        if manifest_id:
            # Test GET /api/manifests/{manifest_id} (get manifest details)
            print(f"Testing GET /api/manifests/{manifest_id}")
            details_response = self.make_request("GET", f"/manifests/{manifest_id}")
            if details_response and details_response.get("manifest_id") == manifest_id:
                print("  ✅ Successfully retrieved manifest details")
                print(f"    Route ID: {details_response.get('route_id')}")
                print(f"    Total entries: {details_response.get('total_entries', 0)}")
                if "deliveries" in details_response:
                    print(f"    Associated deliveries: {len(details_response['deliveries'])}")
                if "stats" in details_response:
                    stats = details_response["stats"]
                    print(f"    Stats - Total: {stats.get('total')}, Pending: {stats.get('pending')}")
                results["get_manifest_details"] = True
            else:
                print("  ❌ Failed to get manifest details")
                results["get_manifest_details"] = False
            
            # Test POST /api/manifests/{manifest_id}/sign (sign manifest)
            print(f"Testing POST /api/manifests/{manifest_id}/sign")
            signature_data = {
                "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            }
            sign_response = self.make_request("POST", f"/manifests/{manifest_id}/sign", signature_data)
            if sign_response and sign_response.get("success"):
                print("  ✅ Successfully signed manifest")
                results["sign_manifest"] = True
            else:
                print("  ❌ Failed to sign manifest")
                results["sign_manifest"] = False
            
            # Test POST /api/manifests/{manifest_id}/close (close manifest)
            print(f"Testing POST /api/manifests/{manifest_id}/close")
            close_response = self.make_request("POST", f"/manifests/{manifest_id}/close")
            if close_response and close_response.get("success"):
                print("  ✅ Successfully closed manifest")
                results["close_manifest"] = True
            else:
                print("  ❌ Failed to close manifest")
                results["close_manifest"] = False
            
            # Test GET /api/manifests/{manifest_id}/pdf (download PDF)
            print(f"Testing GET /api/manifests/{manifest_id}/pdf")
            # For PDF download, we expect a different response format
            try:
                url = f"{self.base_url}/manifests/{manifest_id}/pdf"
                headers = {"Authorization": f"Bearer {self.session_token}"}
                response = requests.get(url, headers=headers, timeout=30)
                
                print(f"  GET /manifests/{manifest_id}/pdf -> {response.status_code}")
                
                if response.status_code == 200:
                    content_type = response.headers.get('content-type', '')
                    if 'application/pdf' in content_type or len(response.content) > 1000:
                        print("  ✅ Successfully generated and downloaded manifest PDF")
                        results["download_manifest_pdf"] = True
                    else:
                        print("  ❌ PDF response doesn't look like a valid PDF")
                        results["download_manifest_pdf"] = False
                else:
                    print(f"  ❌ Failed to download PDF: {response.text}")
                    results["download_manifest_pdf"] = False
            except Exception as e:
                print(f"  ❌ Error downloading PDF: {e}")
                results["download_manifest_pdf"] = False
        
        # Test delivery creation from manifest entries
        print("Testing deliveries created from manifest entries...")
        deliveries_response = self.make_request("GET", "/deliveries")
        if deliveries_response and isinstance(deliveries_response, list):
            # Look for deliveries with our test tracking codes
            manifest_deliveries = [
                d for d in deliveries_response 
                if d.get("tracking_code") in ["1Z999AA10123456784", "1Z999AA10123456785"]
            ]
            if len(manifest_deliveries) >= 2:
                print(f"  ✅ Found {len(manifest_deliveries)} deliveries created from manifest")
                results["manifest_deliveries_created"] = True
                
                # Test tracking code matching
                print("Testing GET /api/deliveries/match/{tracking_code}")
                match_response = self.make_request("GET", "/deliveries/match/1Z999AA10123456784")
                if match_response and match_response.get("match") == True and match_response.get("delivery"):
                    print("  ✅ Successfully matched delivery by tracking code")
                    results["delivery_tracking_match"] = True
                else:
                    print("  ❌ Failed to match delivery by tracking code")
                    print(f"    Response: {match_response}")
                    results["delivery_tracking_match"] = False
            else:
                print(f"  ❌ Expected 2 deliveries from manifest, found {len(manifest_deliveries)}")
                results["manifest_deliveries_created"] = False
                results["delivery_tracking_match"] = False
        else:
            print("  ❌ Failed to retrieve deliveries")
            results["manifest_deliveries_created"] = False
            results["delivery_tracking_match"] = False
        
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
        all_results.update(self.test_delivery_assignment())  # New assignment tests
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