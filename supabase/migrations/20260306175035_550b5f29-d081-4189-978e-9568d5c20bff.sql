CREATE POLICY "Trustees can view beneficiary learning progress"
ON public.heirway_learning_progress
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT tm_ben.user_id
    FROM trust_members tm_ben
    JOIN trust_members tm_trustee ON tm_trustee.trust_id = tm_ben.trust_id
    WHERE tm_trustee.user_id = auth.uid()
      AND tm_trustee.member_type IN ('trustee_manager', 'trustee')
      AND tm_ben.member_type = 'beneficiary'
      AND tm_ben.user_id IS NOT NULL
  )
);