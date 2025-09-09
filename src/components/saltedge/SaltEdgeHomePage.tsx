import { useAuth } from '@/contexts/AuthContext';
import { createSessionForSaltedge } from '@/lib/api/saltedge';
import axiosInstance from '@/lib/axiosInstance'
import React, { useEffect } from 'react'

function SaltEdgeHomePage() {

    const {user, isLoading:authLoading} = useAuth()

    useEffect(() => {
        async function createSession (userId:string) {
            try {
                const response = await createSessionForSaltedge(userId);
                console.log(response)
            } catch (error) {
                console.log(error)
            }
        }

        if(user){
            createSession(user.id)
        }

    }, [])


  return (
    <div>SaltEdgeHomePage</div>
  )
}

export default SaltEdgeHomePage