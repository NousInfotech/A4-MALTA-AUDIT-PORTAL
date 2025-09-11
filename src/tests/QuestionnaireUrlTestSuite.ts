import { isqmApi } from '@/services/api';
import { supabaseStorage } from '@/services/supabaseStorage';

/**
 * Test suite for questionnaire URL management functionality
 */
export class QuestionnaireUrlTestSuite {
  private testQuestionnaireId: string = 'test-questionnaire-id';
  private testUserId: string = 'test-user-id';

  /**
   * Test adding policy URL to questionnaire
   */
  async testAddPolicyUrl() {
    console.log('🧪 Testing addPolicyUrl...');
    
    try {
      const policyData = {
        name: 'Test Policy Document',
        url: 'https://supabase.example.com/policy.pdf',
        version: '1.0',
        description: 'Test policy document',
        uploadedBy: this.testUserId
      };

      const result = await isqmApi.addPolicyUrl(this.testQuestionnaireId, policyData);
      
      console.log('✅ addPolicyUrl test passed:', result);
      return true;
    } catch (error) {
      console.error('❌ addPolicyUrl test failed:', error);
      return false;
    }
  }

  /**
   * Test adding procedure URL to questionnaire
   */
  async testAddProcedureUrl() {
    console.log('🧪 Testing addProcedureUrl...');
    
    try {
      const procedureData = {
        name: 'Test Procedure Document',
        url: 'https://supabase.example.com/procedure.pdf',
        version: '1.0',
        description: 'Test procedure document',
        uploadedBy: this.testUserId
      };

      const result = await isqmApi.addProcedureUrl(this.testQuestionnaireId, procedureData);
      
      console.log('✅ addProcedureUrl test passed:', result);
      return true;
    } catch (error) {
      console.error('❌ addProcedureUrl test failed:', error);
      return false;
    }
  }

  /**
   * Test getting questionnaire URLs
   */
  async testGetQuestionnaireUrls() {
    console.log('🧪 Testing getQuestionnaireUrls...');
    
    try {
      const result = await isqmApi.getQuestionnaireUrls(this.testQuestionnaireId);
      
      console.log('✅ getQuestionnaireUrls test passed:', result);
      return true;
    } catch (error) {
      console.error('❌ getQuestionnaireUrls test failed:', error);
      return false;
    }
  }

  /**
   * Test Supabase storage upload
   */
  async testSupabaseUpload() {
    console.log('🧪 Testing Supabase storage upload...');
    
    try {
      // Create a test PDF blob
      const testContent = 'Test PDF content';
      const testBlob = new Blob([testContent], { type: 'application/pdf' });
      
      const result = await supabaseStorage.uploadFile(
        testBlob, 
        'test-document.pdf', 
        'test/questionnaire'
      );
      
      if (result.success) {
        console.log('✅ Supabase upload test passed:', result.file);
        return true;
      } else {
        console.error('❌ Supabase upload test failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Supabase upload test failed:', error);
      return false;
    }
  }

  /**
   * Test complete document generation and URL storage workflow
   */
  async testCompleteWorkflow() {
    console.log('🧪 Testing complete document workflow...');
    
    try {
      // 1. Generate test content
      const testContent = `
# Test Policy Document

## Overview
This is a test policy document generated for testing purposes.

## Requirements
- Test requirement 1
- Test requirement 2
- Test requirement 3

## Implementation
This document should be properly stored and its URL saved to the questionnaire.
      `;

      // 2. Upload to Supabase
      const uploadResult = await supabaseStorage.uploadFile(
        new Blob([testContent], { type: 'text/plain' }),
        'test-policy.pdf',
        `questionnaires/${this.testQuestionnaireId}/policy`
      );

      if (!uploadResult.success) {
        throw new Error('Upload failed');
      }

      // 3. Save URL to backend
      const urlData = {
        name: 'Test Policy Document',
        url: uploadResult.file!.url,
        version: '1.0',
        description: 'Test policy document for workflow testing',
        uploadedBy: this.testUserId
      };

      await isqmApi.addPolicyUrl(this.testQuestionnaireId, urlData);

      // 4. Verify URL was saved
      const urls = await isqmApi.getQuestionnaireUrls(this.testQuestionnaireId);
      
      console.log('✅ Complete workflow test passed:', urls);
      return true;
    } catch (error) {
      console.error('❌ Complete workflow test failed:', error);
      return false;
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting questionnaire URL management test suite...');
    
    const tests = [
      this.testSupabaseUpload.bind(this),
      this.testAddPolicyUrl.bind(this),
      this.testAddProcedureUrl.bind(this),
      this.testGetQuestionnaireUrls.bind(this),
      this.testCompleteWorkflow.bind(this)
    ];

    let passedTests = 0;
    let totalTests = tests.length;

    for (const test of tests) {
      const result = await test();
      if (result) {
        passedTests++;
      }
    }

    console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! URL management is working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Please check the implementation.');
    }

    return passedTests === totalTests;
  }
}

// Export for use in other modules
export default QuestionnaireUrlTestSuite;
